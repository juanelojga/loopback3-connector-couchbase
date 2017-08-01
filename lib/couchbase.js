'use strict';

const g = require('strong-globalize')();
const util = require('util');

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
    bucket: settings.bucket || 'default'
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