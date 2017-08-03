'use strict';

const assert = require('assert');
const should = require('should');

const initialization = require("./init.js");
const exampleData = require("./exampleData.js");

describe('couchbase test cases', function() {
  let db, countries, COUNTRY_MODEL;

  before(function(done) {
    db = initialization.getDataSource();
    countries = exampleData.countries;
    COUNTRY_MODEL = db.define('COUNTRY_MODEL', {
      gdp: Number,
      countryCode: String,
      name: String,
      population: Number
    });
    done();
  });

  describe('create model', function() {
    it('create', function(done) {
      COUNTRY_MODEL.create(countries[0], function(err, res) {
        if (err) {
          console.log('Error: ', err);
        }
        console.log('Response: ', res.id);
        done();
      })
    });
  });
});

