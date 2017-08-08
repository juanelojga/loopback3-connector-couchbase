'use strict';

const g = require('strong-globalize')();
const util = require('util');
const _ = require('lodash');
const uuid = require('uuid/v4');
const assert = require('assert');

const couchbase = require('couchbase');
const n1qlQuery = couchbase.N1qlQuery;

const SqlConnector = require('loopback-connector').SqlConnector;
const ParameterizedSQL = SqlConnector.ParameterizedSQL;

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
      callback && callback(null, self.bucket);
    });
  } else {
    let error = null;
    self.cluster = new couchbase.Cluster(options.url);
    self.bucket = self.cluster.openBucket(options.bucket, options.password, function(err) {
      if (!err) {
        debug('Couchbase connection established: %j', self.settings || {});
      } else {
        error = err;
        debug('Couchbase connection failed: %j', self.settings || {}, err);
      }
      callback && callback(error, self.bucket);
    });
  }
};

Couchbase.prototype.disconnect = function(callback) {
  if (debug) {
    debug('Disconnect couchbase');
  }
  if (this.bucket) {
    this.bucket = undefined;
  }
  if (this.cluster) {
    this.cluster = undefined;
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

  const bucket = self.bucket;

  if (typeof callback !== 'function') {
    throw new Error(g.f('{{callback}} should be a function'));
  }
  if (debug) {
    debug('N1QL: %s, params: %j', n1ql, params);
  }

  const query = n1qlQuery.fromString(n1ql);

  bucket.query(query, params, function(err, data) {
    if (err) {
      if (debug) {
        debug('Error: %j', err);
      }
    }
    return callback && callback(err, data);
  });
};

Couchbase.prototype.getPrimayIndex = function(callback) {
  let self = this;
  const bucketName = self.settings.bucket;
  const query = 'SELECT * FROM system:indexes WHERE keyspace_id=`' + bucketName + '`LIMIT 1';
  return this.execute(query, callback);
}

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
  return '$';
};

Couchbase.prototype.buildInsert = function(model, data, options) {
  const dataWithId = this.generateId(model, data);
  const insertStmt = this.buildInsertInto(model);
  if (!_.isEqual({}, data)) {
    const values = ParameterizedSQL.join(['$1', '$2'], ', ');
    values.sql = 'VALUES (' + values.sql + ')';
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

function isIdValuePresent(idValue, cb, returningNull) {
  try {
    assert(idValue !== null && idValue !== undefined, 'id value is required');
    return true;
  } catch (err) {
    process.nextTick(function() {
      if (cb) cb(returningNull ? null : err);
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
Couchbase.prototype.updateOrCreate = function(model, data, options, cb) {
  let self = this;

  const stmt = this.buildUpsert(model, data, options);
  self.execute(stmt.sql, stmt.params, options, function(err, result) {
    return cb(err, result);
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
