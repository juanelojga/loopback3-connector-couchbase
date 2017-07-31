'use strict';

module.exports = require('should');

const DataSource = require('loopback-datasource-juggler').DataSource;

const config = require('rc')('loopback', {test: {mysql: {}}}).test.mysql;
console.log(config);
global.getConfig = function(options) {
  var dbConf = {
    host: process.env.MYSQL_HOST || config.host || 'localhost',
    port: process.env.MYSQL_PORT || config.port || 3306,
    database: process.env.MYSQL_DATABASE || 'myapp_test',
    username: process.env.MYSQL_USER || config.username,
    password: process.env.MYSQL_PASSWORD || config.password,
    createDatabase: true,
  };

  if (options) {
    for (var el in options) {
      dbConf[el] = options[el];
    }
  }
  return dbConf;
};

global.getDataSource = global.getSchema = function(options) {
  var db = new DataSource(require('../'), global.getConfig(options));
  return db;
};

global.connectorCapabilities = {
  ilike: false,
  nilike: false,
};

global.sinon = require('sinon');
