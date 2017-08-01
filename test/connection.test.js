'use strict';

require('./init.js');
const assert = require('assert');
const DataSource = require('loopback-datasource-juggler').DataSource;

let config;

before(function() {
  config = global.config;
});

describe('testConnection', function() {
  it('should pass with valid settings', function(done) {
    const db = new DataSource(require('../'), config);
    console.log(db)
    db.ping(function(err) {
      assert(!err, 'Should connect without err.');
      done();
    });
  });
});