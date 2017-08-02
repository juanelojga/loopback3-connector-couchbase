'use strict';

const DataSource = require('loopback-datasource-juggler').DataSource;

const config = require('rc')('loopback', {test: {couchbase: {
  host: process.env.COUCHBASE_HOST || 'localhost',
  port: process.env.COUCHBASE_PORT || 8091,
  bucket: process.env.COUCHBASE_BUCKET || 'loopback',
  password : process.env.COUCHBASE_PASSWORD || ''
}}}).test.couchbase;

const getDataSource = function() {
  const db = new DataSource(require('../'), config);
  return db;
};

const connectorCapabilities = {
  ilike: false,
  nilike: false,
  nestedProperty: true,
};

module.exports = {
  config,
  getDataSource,
  connectorCapabilities
};
