'use strict';

const DataSource = require('loopback-datasource-juggler').DataSource;

const config = require('rc')('loopback', {test: {couchbase: {
  host: process.env.COUCHBASE_HOST || 'localhost',
  port: process.env.COUCHBASE_PORT || 8091,
  bucket: process.env.COUCHBASE_BUCKET || 'default',
  password : process.env.COUCHBASE_PASSWORD || ''
}}}).test.couchbase;

console.log(config);

global.getDataSource = global.getSchema = function() {
  const db = new DataSource(require('../'), config);
  return db;
};

global.connectorCapabilities = {
  ilike: false,
  nilike: false,
  nestedProperty: true,
};

global.sinon = require('sinon');
