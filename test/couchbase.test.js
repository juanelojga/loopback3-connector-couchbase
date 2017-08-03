'use strict';

const assert = require('assert');
const should = require('should');
const uuid = require('uuid/v4');

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
      population: Number,
      updatedAt: Date
    });
    done();
  });

  describe('create model', function() {
    function verifyCountryRows(err, m) {
      should.not.exists(err);
      should.exist(m && m.id);
      should.exist(m && m.gdp);
      should.exist(m && m.countryCode);
      should.exist(m && m.name);
      should.exist(m && m.population);
      should.exist(m && m.updatedAt);
      m.gdp.should.be.type('number');
      m.countryCode.should.be.type('string');
      m.name.should.be.type('string');
      m.population.should.be.type('number');
      m.updatedAt.should.be.type('object');
    }

    it('create a model and generate an id', function(done) {
      COUNTRY_MODEL.create(countries[0], function(err, res) {
        verifyCountryRows(err, res);
        done();
      })
    });
  });
});

