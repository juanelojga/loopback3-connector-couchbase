'use strict';

const assert = require('assert');

const initialization = require("./init.js");

describe('testConnection', function() {
  it('should pass with valid settings', function(done) {
    const db = initialization.getDataSource();
    db.ping(function(err) {
      assert(!err, 'Should connect without err.');
      done();
    });
  });
});
