'use strict';

const assert = require('assert');
const should = require('should');
const uuid = require('uuid/v4');
const _ = require('lodash');

// TODO: Replace with deleteAll method
const couchbase = require('couchbase');
const cluster = new couchbase.Cluster('localhost:8091');
const n1qlQuery = couchbase.N1qlQuery;
// End of couchbase

const initialization = require("./init.js");
const exampleData = require("./exampleData.js");

describe('couchbase test cases', function() {
  let db, countries, COUNTRY_MODEL, COUNTRY_MODEL_WITH_ID;

  before(function(done) {
    db = initialization.getDataSource();
    countries = exampleData.countries;
    COUNTRY_MODEL = db.define('COUNTRY_MODEL', {
      gdp: Number,
      countryCode: String,
      name: String,
      population: Number,
      updatedAt: Date
    }, {
      forceId: false
    });
    COUNTRY_MODEL_WITH_ID = db.define('COUNTRY_MODEL_WITH_ID', {
      id: { type: String, id: true },
      gdp: Number,
      countryCode: String,
      name: String,
      population: Number,
      updatedAt: Date
    });

    deleteAllModelInstances();

    done();
  });

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

  describe('create document', function() {
    it('create a document and generate an id', function(done) {
      COUNTRY_MODEL.create(countries[0], function(err, res) {
        verifyCountryRows(err, res);
        done();
      });
    });

    it('create a document that has an id defined', function(done) {
      const id = uuid();

      let newCountry = _.omit(countries[0]);
      newCountry.id = id;
      COUNTRY_MODEL_WITH_ID.create(newCountry, function(err, res) {
        should.not.exists(err);
        assert.equal(res.id, id);
        verifyCountryRows(err, res);
        done();
      });
    });

    it('create a document that has an id defined but empty', function(done) {
      const id = uuid();

      let newCountry = _.omit(countries[0]);
      COUNTRY_MODEL_WITH_ID.create(newCountry, function(err, res) {
        should.not.exists(err);
        should.exist(res && res.id);
        verifyCountryRows(err, res);
        done();
      });
    });
  });

  describe('update document', function() {
    let country, countryId;

    beforeEach(function(done) {
        COUNTRY_MODEL_WITH_ID.create(countries[1], function(err, res) {
          country = res;
          countryId = 'COUNTRY_MODEL::' + res.id;
          done();
        })
    });

    it('update a document', function(done) {
      let newCountry = _.omit(countries[2], 'population');
      country.updateAttributes(newCountry, function(err, res) {
        should.not.exists(err);
        should.exist(res && res.id);
        verifyCountryRows(err, res);
        done();
      })
    });

    it('upsert a document', function(done) {
      //let newCountry = _.omit(countries[2], ['gdp', 'population']);
      let newCountry = new COUNTRY_MODEL_WITH_ID(countries[2]);
      should.not.exist(newCountry.id);
      newCountry.save(function(err, instance) {
        should.exist(instance.id);
        should.exist(newCountry.id);
        //verifyCountryRows(err, instance);
        done();
      });
    });

    // TODO: find an object by id an update id
    // Person.findOne(function(err, p) {
        //   if (err) return done(err);
        //   p.name = 'Hans';
        //   p.save(function(err) {
        //     if (err) return done(err);
        //     p.name.should.equal('Hans');
        //     Person.findOne(function(err, p) {
        //       if (err) return done(err);
        //       p.name.should.equal('Hans');
        //       done();
        //     });
        //   });
        // });
  });

  describe('find document', function() {
    beforeEach(function(done) {
      COUNTRY_MODEL_WITH_ID.destroyAll(done);
    });

    it('find all instances without filter', function(done) {
      COUNTRY_MODEL_WITH_ID.create(countries[0], function(err, country) {
        COUNTRY_MODEL_WITH_ID.create(countries[1], function(err, country) {
          COUNTRY_MODEL_WITH_ID.find(function(err, response) {
            should.not.exist(err);
            response.length.should.be.equal(2);
            done();
          });
        });
      });
    });

    it('find one instance with limit and skip', function(done) {
      COUNTRY_MODEL_WITH_ID.create(countries[0], function(err, country) {
        COUNTRY_MODEL_WITH_ID.create(countries[1], function(err, country) {
          COUNTRY_MODEL_WITH_ID.find({limit: 1, offset: 0}, function(err, response) {
            should.not.exist(err);
            console.log('limit',response);
            response.length.should.be.equal(1);
          
            COUNTRY_MODEL_WITH_ID.find({limit: 1, offset: 1}, function(err, response) {
              should.not.exist(err);
              console.log('offset',response);
              response.length.should.be.equal(1);
              done();
            });
          });
        });
      });
    });
  });

  function deleteAllModelInstances() {

  }

  after(function() {
    //return deleteAllModelInstances();
  })
});
