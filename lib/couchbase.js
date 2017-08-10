'use strict';

const g = require('strong-globalize')();
const util = require('util');
const _ = require('lodash');
const uuid = require('uuid/v1');
const assert = require('assert');

const couchbase = require('couchbase');
const n1qlQuery = couchbase.N1qlQuery;

const SqlConnector = require('loopback-connector').SqlConnector;
const ParameterizedSQL = SqlConnector.ParameterizedSQL;

const PLACEHOLDER = ParameterizedSQL.PLACEHOLDER;

const debug = require('debug')('loopback:connector:couchbase');

exports.initialize = function initializeDataSource(dataSource, callback) {
  if (!couchbase) {
    return;
  }

  dataSource.connector = new Couchbase(dataSource, dataSource.settings);

  if (callback) {
    if (dataSource.settings.lazyConnect) {
      process.nextTick(function() {
        callback();
      });
    } else {
      dataSource.connector.connect(callback);
    }
  }
};

exports.Couchbase = Couchbase;

function Couchbase(dataSource, settings) {
	this.dataSource = dataSource;
  SqlConnector.call(this, 'couchbase', settings);
}

util.inherits(Couchbase, SqlConnector);

function configurationOptions(settings) {
  const url = 'couchbase://' + settings.host + ':' + settings.port;
  return {
    host: settings.host || 'localhost',
    port: settings.port || 8091,
    bucket: settings.bucket || 'default',
    password : settings.password || '',
    url: url
  };
}

Couchbase.prototype.connect = function(callback) {
  let self = this;
  const options = configurationOptions(self.settings);

  if (self.bucket) {
    process.nextTick(function() {
      callback(null, self.bucket);
    });
  } else {
    self.cluster = new couchbase.Cluster(options.url);
    self.bucket = self.cluster.openBucket(options.bucket, options.password, function(err) {
      if (err) {
        callback(err);
      }
      callback(null, self.bucket);
    });
  }
};

Couchbase.prototype.disconnect = function(callback) {
  let self = this;

  if (self.bucket) {
    self.bucket.disconnect();
  }

  if (callback) {
    process.nextTick(callback);
  }
};

Couchbase.prototype.ping = function(callback) {
  this.execute('SELECT * FROM system:datastores', callback);
};

Couchbase.prototype.executeSQL = function(n1ql, params, options, callback) {
  let self = this;

  if (typeof callback !== 'function') {
    throw new Error(g.f('{{callback}} should be a function'));
  }
  if (debug) {
    debug('N1QL: %s, params: %j', n1ql, params);
  }

  console.log('n1ql',n1ql)
  console.log('params',params)
  const query = n1qlQuery.fromString(n1ql).adhoc(false).consistency(2);

  self.bucket.query(query, params, function(err, data, meta) {
    console.log('data',data)
    console.log('meta',meta)
    return callback(err, data);
  });
};

Couchbase.prototype.escapeName = function(name) {
  if (!name) {
    return name;
  }
  return escapeIdentifier(name);
};

function escapeIdentifier(str) {
  return str;
}

Couchbase.prototype.toColumnValue = function(property, value) {
  if (!property) {
    return value;
  } else {
    switch(property.type) {
      case Number:
        if (isNaN(value)) {
          return value;
        }
        return value;
        break;

      case String:
        return String(value);
        break;

      case Date:
        if (!value.toUTCString) {
          value = new Date(value);
        }
        return formatDate(value);
        break;

      case Boolean:
        return !!value;
        break;

      default:
        return value;
        break;
    }
  }
}

function formatDate(date) {
  return date.getUTCFullYear() + '-' +
    fillZeros(date.getUTCMonth() + 1) + '-' +
    fillZeros(date.getUTCDate()) + ' ' +
    fillZeros(date.getUTCHours()) + ':' +
    fillZeros(date.getUTCMinutes()) + ':' +
    fillZeros(date.getUTCSeconds());

  function fillZeros(v) {
    return parseInt(v) < 10 ? '0' + v : v;
  }
}

Couchbase.prototype.getPlaceholderForValue = function(key) {
  return '$' + key;
};

Couchbase.prototype.buildInsert = function(model, data, options) {
  const dataWithId = this.generateId(model, data);
  const insertStmt = this.buildInsertInto(model);
  if (!_.isEqual({}, data)) {
    const values = ParameterizedSQL.join(['$1', '$2'], ', ');
    values.sql = 'VALUES (' + values.sql + ') RETURNING *';
    values.params = dataWithId;
    insertStmt.merge(values);
  } else {
    throw new Error(g.f('{{buildInsert()}} no data defined'));
  }
  return insertStmt;
};

Couchbase.prototype.buildInsertInto = function(model) {
  let self = this;
  const settings = self.settings;

  let stmt = new ParameterizedSQL("INSERT INTO `" + settings.bucket + "`");
  const fields = ['KEY', 'VALUE'];
  const columnNames = fields.join(', ');
  stmt.merge(' (' + columnNames + ')', '');
  return stmt;
};

Couchbase.prototype.generateId = function(model, data) {
  let modelId;

  data.modelName = model;
  if (data.id) {
    modelId = data.id
  } else {
    modelId = uuid();
    data.id = modelId;
  }
  
  const docId = model + '::' + modelId;
  return [docId, data];
}

Couchbase.prototype.getInsertedId = function(model) {
  return model[1].id;
};

Couchbase.prototype.create = function(model, data, options, callback) {
  const self = this;
  // TODO: check if the document id exists if its defined
  const stmt = this.buildInsert(model, data, options);
  this.execute(stmt.sql, stmt.params, options, function(err, info) {
    if (err) {
      callback(err);
    } else {
      const insertedId = self.getInsertedId(stmt.params);
      callback(err, insertedId);
    }
  });
};

Couchbase.prototype.updateAttributes = function(model, id, data, options, callback) {
  if (!isIdValuePresent(id, callback)) return;
  const where = this._buildWhereObjById(model, id, data);
  this.updateAll(model, where, data, options, function(err, info) {
    if (err) return callback(err);
    if (info.count === 0) {
      return callback(errorIdNotFoundForUpdate(where.id));
    } else {
      return callback(null, info);
    };
  });
};

function isIdValuePresent(idValue, callback, returningNull) {
  try {
    assert(idValue !== null && idValue !== undefined, 'id value is required');
    return true;
  } catch (err) {
    process.nextTick(function() {
      if (callback) callback(returningNull ? null : err);
    });
    return false;
  }
}

Couchbase.prototype.update = function(model, where, data, options, callback) {
  const fields = this.buildFields(model, data);
  const stmt = this.buildUpdateInto(model, where, data, options, fields);
  const params = this.buildUpdateParams(model, fields.columnValues, where);
  this._executeAlteringQuery(model, stmt.sql, params, options, callback || NOOP);
};

Couchbase.prototype.buildUpdateInto = function(model, where, data, options, fields) {
  let self = this;
  const settings = self.settings;
  
  let stmt = new ParameterizedSQL("UPDATE `" + settings.bucket + "` USE KEYS($1) SET");
  let columns = [];
  for (let i = 0; i < fields.names.length; i++) {
    columns.push(fields.names[i] + ' = $' + (i + 2));
  }
  const columnNames = columns.join(', ');
  stmt.merge(' ' + columnNames, '');
  return stmt;
};

Couchbase.prototype.buildUpdateParams = function(model, fields, where) {
  if (fields.length > 0) {
    let params = [model + '::' + where.id];
    for (let i = 0; i < fields.length; i++) {
      params.push(fields[i].params[0]);
    }
    return params;
  } else {
    return [];
  }
}

Couchbase.prototype.getCountForAffectedRows = function(model, info) {
  const affectedRows = info && typeof info.affectedRows === 'number' ?
    info.affectedRows : undefined;
  return affectedRows;
};

Couchbase.prototype.save =
Couchbase.prototype.updateOrCreate = function(model, data, options, callback) {
  let self = this;

  const stmt = this.buildUpsert(model, data, options);
  self.execute(stmt.sql, stmt.params, options, function(err, result) {
    return callback(err, result);
  });
};

Couchbase.prototype.buildUpsert = function(model, data, options) {
  let values = _.omit(options, ['throws', 'validate']);
  values.id = data.id;

  const dataWithId = this.generateId(model, values);
  const upsertStmt = this.buildUpsertInto(model);
  if (!_.isEqual({}, data)) {
    const values = ParameterizedSQL.join(['$1', '$2'], ', ');
    values.sql = 'VALUES (' + values.sql + ') RETURNING *';
    values.params = dataWithId;
    upsertStmt.merge(values);
  } else {
    throw new Error(g.f('{{buildUpsert()}} no data defined'));
  }
  return upsertStmt;
};

Couchbase.prototype.buildUpsertInto = function(model) {
  let self = this;
  const settings = self.settings;

  let stmt = new ParameterizedSQL("UPSERT INTO `" + settings.bucket + "`");
  const fields = ['KEY', 'VALUE'];
  const columnNames = fields.join(', ');
  stmt.merge(' (' + columnNames + ')', '');
  return stmt;
};

// TODO: check if find by id, could be done using "USE KEYS" statement
Couchbase.prototype.all = function(model, filter, options, callback) {
  const self = this;

  filter = filter || {};
  const stmt = this.buildSelect(model, filter, options);

  this.execute(stmt.sql, stmt.params, options, function(err, data) {
    if (err) {
      return callback(err, []);
    }

    var objs = data.map(function(obj) {
      return self.fromRow(model, obj);
    });

    if (filter && filter.include) {
      self.getModelDefinition(model).model.include(
        objs, filter.include, options, callback);
    } else {
      callback(null, objs);
    }
  });
};

Couchbase.prototype.buildSelect = function(model, filter, options) {
  let self = this;
  const settings = self.settings;

  if (!filter.order) {
    const idNames = this.idNames(model);
    if (idNames && idNames.length) {
      filter.order = idNames;
    }
  }

  let selectStmt = new ParameterizedSQL('SELECT ' +
    this.buildColumnNames(model, filter) +
    ' FROM `' + settings.bucket + '`');

  // Add the filter by modelName condition
  // TODO: Replace with a constant the modelName constant
  if (filter.where) {
    filter.where.modelName = model;
  } else {
    filter.where = {modelName: model};
  }

  if (filter) {
    if (filter.where) {
      const whereStmt = this.buildWhere(model, filter.where);
      selectStmt.merge(whereStmt);
    }

    if (filter.order) {
      selectStmt.merge(this.buildOrderBy(model, filter.order));
    }

    if (filter.limit || filter.skip || filter.offset) {
      selectStmt = this.applyPagination(
        model, selectStmt, filter);
    }
  }
  return this.parameterize(selectStmt);
};

Couchbase.prototype.buildColumnNames = function(model, filter) {
  const fieldsFilter = filter && filter.fields;
  const cols = this.getModelDefinition(model).properties;
  if (!cols) {
    return '*';
  }
  let self = this;
  let keys = Object.keys(cols);
  if (Array.isArray(fieldsFilter) && fieldsFilter.length > 0) {
    // Not empty array, including all the fields that are valid properties
    keys = fieldsFilter.filter(function(f) {
      return cols[f];
    });
  } else if ('object' === typeof fieldsFilter &&
    Object.keys(fieldsFilter).length > 0) {
    // { field1: boolean, field2: boolean ... }
    let included = [];
    let excluded = [];
    keys.forEach(function(k) {
      if (fieldsFilter[k]) {
        included.push(k);
      } else if ((k in fieldsFilter) && !fieldsFilter[k]) {
        excluded.push(k);
      }
    });
    if (included.length > 0) {
      keys = included;
    } else if (excluded.length > 0) {
      excluded.forEach(function(e) {
        const index = keys.indexOf(e);
        keys.splice(index, 1);
      });
    }
  }

  _.pull(keys, 'modelName');
  const names = keys.map(function(c) {
    return self.columnEscaped(model, c);
  });

  return names.join(',');
};

Couchbase.prototype.fromColumnValue = function(prop, val) {
  if (val == null) {
    return val;
  }
  if (prop) {
    switch (prop.type.name) {
      case 'Number':
        val = Number(val);
        break;
      case 'String':
        val = String(val);
        break;
      case 'Date':
      case 'DateString':
        // MySQL allows, unless NO_ZERO_DATE is set, dummy date/time entries
        // new Date() will return Invalid Date for those, so we need to handle
        // those separate.
        if (!val || /^0{4}(-00){2}( (00:){2}0{2}(\.0{1,6}){0,1}){0,1}$/.test(val)) {
          val = null;
        }
        break;
      case 'Boolean':
        val = Boolean(val);
        break;
      case 'GeoPoint':
      case 'Point':
        val = {
          lng: val.x,
          lat: val.y,
        };
        break;
      case 'List':
      case 'Array':
      case 'Object':
      case 'JSON':
        if (typeof val === 'string') {
          val = JSON.parse(val);
        }
        break;
      default:
        if (!Array.isArray(prop.type) && !prop.type.modelName) {
          // Do not convert array and model types
          val = prop.type(val);
        }
        break;
    }
  }
  return val;
};

Couchbase.prototype._buildLimit = function(model, limit, offset) {
  if (isNaN(limit)) {
    limit = 0;
  }
  if (isNaN(offset)) {
    offset = 0;
  }
  if (!limit && !offset) {
    return '';
  }
  return 'LIMIT ' + limit + (offset ? (' OFFSET ' + offset) : '');
};

Couchbase.prototype.applyPagination = function(model, stmt, filter) {
  const limitClause = this._buildLimit(model, filter.limit,
    filter.offset || filter.skip);
  return stmt.merge(limitClause);
};

// TODO: It needs a refactor
Couchbase.prototype.destroyAll = function(model, where, options, callback) {
  this.execute('DELETE FROM `loopback-test`', callback);
};

Couchbase.prototype.buildWhere = function(model, where) {
  const whereClause = this._buildWhere(model, where);
  if (whereClause.sql) {
    whereClause.sql = 'WHERE ' + whereClause.sql;
  }
  return whereClause;
};

Couchbase.prototype._buildWhere = function(model, where) {
  let columnValue, sqlExp;
  if (!where) {
    return new ParameterizedSQL('');
  }
  if (typeof where !== 'object' || Array.isArray(where)) {
    debug('Invalid value for where: %j', where);
    return new ParameterizedSQL('');
  }

  let self = this;

  let props = self.getModelDefinition(model).properties;
  // Add the modelName prop
  props.modelName = {type: String};

  let whereStmts = [];
  for (let key in where) {
    let stmt = new ParameterizedSQL('', []);
    // Handle and/or operators
    if (key === 'and' || key === 'or') {
      let branches = [];
      let branchParams = [];
      let clauses = where[key];
      if (Array.isArray(clauses)) {
        for (let i = 0, n = clauses.length; i < n; i++) {
          let stmtForClause = self._buildWhere(model, clauses[i]);
          if (stmtForClause.sql) {
            stmtForClause.sql = '(' + stmtForClause.sql + ')';
            branchParams = branchParams.concat(stmtForClause.params);
            branches.push(stmtForClause.sql);
          }
        }
        stmt.merge({
          sql: branches.join(' ' + key.toUpperCase() + ' '),
          params: branchParams,
        });
        whereStmts.push(stmt);
        continue;
      }
      // The value is not an array, fall back to regular fields
    }
    let p = props[key];
    if (p == null) {
      // Unknown property, ignore it
      debug('Unknown property %s is skipped for model %s', key, model);
      continue;
    }
    // eslint-disable one-var
    let expression = where[key];
    const columnName = self.columnEscaped(model, key);
    // eslint-enable one-var
    if (expression === null || expression === undefined) {
      stmt.merge(columnName + ' IS NULL');
    } else if (expression && expression.constructor === Object) {
      const operator = Object.keys(expression)[0];
      // Get the expression without the operator
      expression = expression[operator];
      if (operator === 'inq' || operator === 'nin' || operator === 'between') {
        columnValue = [];
        if (Array.isArray(expression)) {
          // Column value is a list
          for (let j = 0, m = expression.length; j < m; j++) {
            columnValue.push(this.toColumnValue(p, expression[j]));
          }
        } else {
          columnValue.push(this.toColumnValue(p, expression));
        }
        if (operator === 'between') {
          // BETWEEN v1 AND v2
          const v1 = columnValue[0] === undefined ? null : columnValue[0];
          const v2 = columnValue[1] === undefined ? null : columnValue[1];
          columnValue = [v1, v2];
        } else {
          // IN (v1,v2,v3) or NOT IN (v1,v2,v3)
          if (columnValue.length === 0) {
            if (operator === 'inq') {
              columnValue = [null];
            } else {
              // nin () is true
              continue;
            }
          }
        }
      } else if (operator === 'regexp' && expression instanceof RegExp) {
        // do not coerce RegExp based on property definitions
        columnValue = expression;
      } else {
        columnValue = this.toColumnValue(p, expression);
      }
      sqlExp = self.buildExpression(columnName, operator, columnValue, p);
      stmt.merge(sqlExp);
    } else {
      // The expression is the field value, not a condition
      columnValue = self.toColumnValue(p, expression);
      if (columnValue === null) {
        stmt.merge(columnName + ' IS NULL');
      } else {
        if (columnValue instanceof ParameterizedSQL) {
          stmt.merge(columnName + '=').merge(columnValue);
        } else {
          stmt.merge({
            sql: columnName + '=?',
            params: [columnValue],
          });
        }
      }
    }
    whereStmts.push(stmt);
  }
  let params = [];
  let sqls = [];
  for (let k = 0, s = whereStmts.length; k < s; k++) {
    sqls.push(whereStmts[k].sql);
    params = params.concat(whereStmts[k].params);
  }
  const whereStmt = new ParameterizedSQL({
    sql: sqls.join(' AND '),
    params: params,
  });
  return whereStmt;
};

Couchbase.prototype.buildExpression =
function(columnName, operator, columnValue, propertyValue) {
  function buildClause(columnValue, separator, grouping, brackets) {
    var values = [];
    for (var i = 0, n = columnValue.length; i < n; i++) {
      if (columnValue[i] instanceof ParameterizedSQL) {
        values.push(columnValue[i]);
      } else {
        values.push(new ParameterizedSQL(PLACEHOLDER, [columnValue[i]]));
      }
    }
    separator = separator || ',';
    var clause = ParameterizedSQL.join(values, separator);
    if (grouping) {
      if (brackets) {
        clause.sql = '[' + clause.sql + ']';
      } else {
        clause.sql = '(' + clause.sql + ')';
      }
      
    }
    return clause;
  }

  var sqlExp = columnName;
  var clause;
  if (columnValue instanceof ParameterizedSQL) {
    clause = columnValue;
  } else {
    clause = new ParameterizedSQL(PLACEHOLDER, [columnValue]);
  }
  switch (operator) {
    case 'gt':
      sqlExp += '>';
      break;
    case 'gte':
      sqlExp += '>=';
      break;
    case 'lt':
      sqlExp += '<';
      break;
    case 'lte':
      sqlExp += '<=';
      break;
    case 'between':
      sqlExp += ' BETWEEN ';
      clause = buildClause(columnValue, ' AND ', false, false);
      break;
    case 'inq':
      sqlExp += ' IN ';
      clause = buildClause(columnValue, ',', true, true);
      break;
    case 'nin':
      sqlExp += ' NOT IN ';
      clause = buildClause(columnValue, ',', true, true);
      break;
    case 'neq':
      if (columnValue == null) {
        return new ParameterizedSQL(sqlExp + ' IS NOT NULL');
      }
      sqlExp += '!=';
      break;
    case 'like':
      sqlExp += ' LIKE ';
      break;
    case 'nlike':
      sqlExp += ' NOT LIKE ';
      break;
    // this case not needed since each database has its own regex syntax, but
    // we leave the MySQL syntax here as a placeholder
    case 'regexp':
      sqlExp += ' REGEXP ';
      break;
  }
  var stmt = ParameterizedSQL.join([sqlExp, clause], '');
  return stmt;
};

Couchbase.prototype.count = function(model, where, options, callback) {
  let self = this;
  const settings = self.settings;

  // TODO: Replace modelName property with a constant
  where.modelName = model;

  let stmt = new ParameterizedSQL('SELECT count(id) as cnt FROM `' +
    settings.bucket + '`');
  stmt = stmt.merge(this.buildWhere(model, where));
  stmt = this.parameterize(stmt);

  this.execute(stmt.sql, stmt.params,
    function(err, res) {
      if (err) {
        return callback(err);
      }
      const c = (res && res[0] && res[0].cnt) || 0;
      callback(err, Number(c));
    });
};
