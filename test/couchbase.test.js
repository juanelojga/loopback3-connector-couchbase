'use strict';

const assert = require('assert');
const should = require('should');
const uuid = require('uuid/v1');
const _ = require('lodash');

const initialization = require("./init.js");
const exampleData = require("./exampleData.js");

describe('couchbase test cases', function() {
  let db, countries, CountryModel, CountryModelWithId, StudentModel;

  before(function(done) {
    db = initialization.getDataSource();
    countries = exampleData.countries;
    CountryModel = db.define('CountryModel', {
      gdp: Number,
      countryCode: String,
      name: String,
      population: Number,
      updatedAt: Date
    }, {
      forceId: false
    });
    CountryModelWithId = db.define('CountryModelWithId', {
      id: {type: String, id: true},
      gdp: Number,
      countryCode: String,
      name: String,
      population: Number,
      updatedAt: Date
    });
    StudentModel = db.define('StudentModel', {
      name: {type: String, length: 255},
      age: {type: Number}
    }, {
      forceId: false
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
      CountryModel.create(countries[0], function(err, res) {
        verifyCountryRows(err, res);
        done();
      });
    });

    it('create a document that has an id defined', function(done) {
      const id = uuid();

      let newCountry = _.omit(countries[0]);
      newCountry.id = id;
      CountryModelWithId.create(newCountry, function(err, res) {
        should.not.exists(err);
        assert.equal(res.id, id);
        verifyCountryRows(err, res);
        done();
      });
    });

    it('create a document that has an id defined but empty', function(done) {
      const id = uuid();

      let newCountry = _.omit(countries[0]);
      CountryModelWithId.create(newCountry, function(err, res) {
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
        CountryModelWithId.create(countries[1], function(err, res) {
          country = res;
          countryId = 'CountryModel::' + res.id;
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
      let newCountry = new CountryModelWithId(countries[2]);
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
      CountryModelWithId.destroyAll(done);
    });

    it('find all instances without filter', function(done) {
      CountryModelWithId.create(countries[0], function(err, country) {
        CountryModelWithId.create(countries[1], function(err, country) {
          StudentModel.create({name: 'Juan Almeida', age: 30}, function(err, person) {
            CountryModelWithId.find(function(err, response) {
              should.not.exist(err);
              response.length.should.be.equal(2);
              done();
            });
          });
        });
      });
    });

    // TODO: Improve assertions
    it('find one instance with limit and skip', function(done) {
      CountryModelWithId.create(countries[0], function(err, country) {
        CountryModelWithId.create(countries[1], function(err, country) {
          StudentModel.create({name: 'Juan Almeida', age: 30}, function(err, person) {
            StudentModel.find({limit: 1, offset: 0}, function(err, response) {
              should.not.exist(err);
              response.length.should.be.equal(1);
            
              CountryModelWithId.find({limit: 1, offset: 1}, function(err, response) {
                should.not.exist(err);
                response.length.should.be.equal(1);
                done();
              });
            });
          });
        });
      });
    });

    it('retrieve only one field', function(done) {
      CountryModelWithId.create(countries[0], function(err, country) {
        CountryModelWithId.create(countries[1], function(err, country) {
          StudentModel.create({name: 'Juan Almeida', age: 30}, function(err, person) {
            CountryModelWithId.find({fields: ['name', 'population']}, function(err, response) {
              should.not.exist(err);
              response.length.should.be.equal(2);
              should.exist(response[0].name);
              should.exist(response[0].population);
              should.not.exist(response[0].id);
              done();
            });
          });
        });
      });
    });

    it('should allow to find using equal', function(done) {
      CountryModel.create({name: 'Ecuador', countryCode: 'EC'}, function(err, country) {
        CountryModel.find({where: {name: 'Ecuador'}}, function(err, response) {
          should.not.exists(err);
          response.should.have.property('length',1);
          done();
        });
      });
    });

    it('should allow to find using like', function(done) {
      CountryModel.create({name: 'Ecuador', countryCode: 'EC'}, function(err, country) {
        CountryModel.find({where: {name: {like: 'E%or'}}}, function(err, response) {
          should.not.exists(err);
          response.should.have.property('length',1);
          done();
        });
      });
    });

    it('should support like for no match', function(done) {
      CountryModel.create({name: 'Ecuador', countryCode: 'EC'}, function(err, country) {
        CountryModel.find({where: {name: {like: 'M%or'}}}, function(err, response) {
          should.not.exists(err);
          response.should.have.property('length',0);
          done();
        });
      });
    });

    it('should allow to find using nlike', function(done) {
      CountryModel.create({name: 'Ecuador', countryCode: 'EC'}, function(err, country) {
        CountryModel.find({where: {name: {nlike: 'E%or'}}}, function(err, response) {
          should.not.exists(err);
          response.should.have.property('length',0);
          done();
        });
      });
    });

    it('should support nlike for no match', function(done) {
      CountryModel.create({name: 'Ecuador', countryCode: 'EC'}, function(err, country) {
        CountryModel.find({where: {name: {nlike: 'M%or'}}}, function(err, response) {
          should.not.exists(err);
          response.should.have.property('length',1);
          done();
        });
      });
    });

    it('should support "and" operator that is satisfied', function(done) {
      CountryModel.create({name: 'Ecuador', countryCode: 'EC'}, function(err, country) {
        CountryModel.find({where: {and: [
          {name: 'Ecuador'},
          {countryCode: 'EC'}
        ]}}, function(err, response) {
          should.not.exists(err);
          response.should.have.property('length',1);
          done();
        });
      });
    });

    it('should support "and" operator that is not satisfied', function(done) {
      CountryModel.create({name: 'Ecuador', countryCode: 'EC'}, function(err, country) {
        CountryModel.find({where: {and: [
          {name: 'Ecuador'},
          {countryCode: 'CO'}
        ]}}, function(err, response) {
          should.not.exists(err);
          response.should.have.property('length',0);
          done();
        });
      });
    });

    it('should support "or" operator that is satisfied', function(done) {
      CountryModel.create({name: 'Ecuador', countryCode: 'EC'}, function(err, country) {
        CountryModel.find({where: {or: [
          {name: 'Ecuador'},
          {countryCode: 'CO'}
        ]}}, function(err, response) {
          should.not.exists(err);
          response.should.have.property('length',1);
          done();
        });
      });
    });

    it('should support "or" operator that is not satisfied', function(done) {
      CountryModel.create({name: 'Ecuador', countryCode: 'EC'}, function(err, country) {
        CountryModel.find({where: {or: [
          {name: 'Ecuador1'},
          {countryCode: 'EC1'}
        ]}}, function(err, response) {
          should.not.exists(err);
          response.should.have.property('length',0);
          done();
        });
      });
    });

    describe('null vals in different operators', function() {
      let defaultCountry = _.omit(exampleData.countries[0]);

      it('should handle null in inq operator', function(done) {
        let id = uuid();

        defaultCountry.id = id;
        defaultCountry.name = 'Ecuador';
        defaultCountry.countryCode = 'EC';

        CountryModelWithId.create(defaultCountry, function(err, response) {
          should.not.exist(err);
          response.id.should.equal(defaultCountry.id);

          CountryModelWithId.find({where: {id: {inq: [null, id]}}}, function(err, response) {
            should.not.exist(err);
            response.length.should.equal(1);
            response[0].name.should.equal('Ecuador');
            response[0].id.should.equal(id);
            done();
          });
        });
      });

      it('should handle null in nin operator', function(done) {
        let id = uuid();

        defaultCountry.id = id;
        defaultCountry.name = 'Peru';
        defaultCountry.countryCode = 'PE';

        CountryModelWithId.create(defaultCountry, function(err, response) {
          should.not.exist(err);
          response.id.should.equal(defaultCountry.id);

          CountryModelWithId.find({where: {id: {nin: [null, uuid()]}}}, function(err, response) {
            should.not.exist(err);
            response.length.should.equal(1);
            response[0].name.should.equal('Peru');
            response[0].id.should.equal(id);
            done();
          });
        });
      });

      it('should handle null in neq operator', function(done) {
        let id = uuid();

        defaultCountry.id = id;
        defaultCountry.name = 'Ecuador';
        defaultCountry.countryCode = 'EC';

        CountryModelWithId.create(defaultCountry, function(err, response) {
          should.not.exist(err);
          response.id.should.equal(defaultCountry.id);

          CountryModelWithId.find({where: {id: {neq: null}}}, function(err, response) {
            should.not.exist(err);
            response.length.should.equal(1);
            response[0].name.should.equal('Ecuador');
            response[0].id.should.equal(id);
            done();
          });
        });
      });

      it('should handle null in neq operator', function(done) {
        let id = uuid();

        defaultCountry.id = id;
        defaultCountry.updatedAt = undefined;

        CountryModelWithId.create(defaultCountry, function(err, response) {
          should.not.exist(err);
          response.id.should.equal(defaultCountry.id);

          CountryModelWithId.find({where: {and: [
              {id: {nin: [null]}},
              {name: {nin: [null]}},
              {countryCode: {nin: [null]}}
            ]}}, function(err, response) {
            should.not.exist(err);
            response.length.should.equal(1);
            done();
          });
        });
      });

      it('should support where for count', function(done) {
        CountryModel.create({name: 'My Country', countryCode: 'MC'}, function(err, response) {
          CountryModel.count({and: [
            {name: 'My Country'},
            {countryCode: 'MC'},
          ]}, function(err, count) {
            should.not.exist(err);
            count.should.be.equal(1);
            CountryModel.count({and: [
              {name: 'My Country1'},
              {countryCode: 'MC'},
            ]}, function(err, count) {
              should.not.exist(err);
              count.should.be.equal(0);
              CountryModel.count(function(err, count) {
                should.not.exist(err);
                count.should.be.equal(1);
                done();
              });
            });
          });
        });
      });
    });

    describe('findById method', function() {
      let defaultCountry = _.omit(exampleData.countries[1]);

      it('should return one document', function(done) {
        let id = uuid();

        defaultCountry.id = id;
        defaultCountry.name = 'Ecuador';
        defaultCountry.countryCode = 'EC';

        CountryModelWithId.create(defaultCountry, function(err, response) {
          should.not.exist(err);
          response.id.should.equal(defaultCountry.id);

          CountryModelWithId.findById(id, function(err, response) {
            should.not.exist(err);
            response.name.should.equal('Ecuador');
            response.id.should.equal(id);
            done();
          });
        });
      });
    });

    describe('exists method', function() {
      let defaultCountry = _.omit(exampleData.countries[1]);

      it('should return true because document exists', function(done) {
        let id = uuid();

        defaultCountry.id = id;
        defaultCountry.name = 'Peru';
        defaultCountry.countryCode = 'PE';

        CountryModelWithId.create(defaultCountry, function(err, response) {
          should.not.exist(err);
          response.id.should.equal(defaultCountry.id);

          CountryModelWithId.exists(id, function(err, response) {
            should.not.exist(err);
            response.should.be.true;
            done();
          });
        });
      });

      it('should return false because document does not exists', function(done) {
        let id = uuid();

        defaultCountry.id = id;
        defaultCountry.name = 'Peru';
        defaultCountry.countryCode = 'PE';

        CountryModelWithId.create(defaultCountry, function(err, response) {
          should.not.exist(err);
          response.id.should.equal(defaultCountry.id);

          CountryModelWithId.exists(uuid(), function(err, response) {
            should.not.exist(err);
            response.should.be.false;
            done();
          });
        });
      });
    });
  });

  function deleteAllModelInstances() {
    // TODO: Replace when deleteAll will be defined
    CountryModelWithId.deleteAll();
  }

  after(function() {
    //return deleteAllModelInstances();
  })
});
