'use strict';

const g = require('strong-globalize')();

const couchbase = require('couchbase');
const n1qlQuery = couchbase.N1qlQuery;

const SqlConnector = require('loopback-connector').SqlConnector;
const ParameterizedSQL = SqlConnector.ParameterizedSQL;

const debug = require('debug')('loopback:connector:couchbase');
const debugQuery = require('debug')('loopback:connector:couchbase:query');
const debugData = require('debug')('loopback:connector:couchbase:data');
const debugFilter = require('debug')('loopback:connector:couchbase:filter');

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
