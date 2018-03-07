'use strict';

const assert = require('assert');
const should = require('should');
const uuid = require('uuid/v1');
const _ = require('lodash');

const GeoPoint = require('loopback-datasource-juggler').GeoPoint;

const initialization = require("./init.js");
const exampleData = require("./exampleData.js");

describe('couchbase test cases', function() {
  this.timeout(10000);

  let db, countries, CountryModel, CountryModelWithId,
    StudentModel, UserModel, TeamModel, MerchantModel;

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
      age: {type: Number},
      parents: {type: Object}
    }, {
      forceId: false
    });
    UserModel = db.define('UserModel', {
      name: {type: String, length: 255},
      email: {type: String, length: 255},
      realm: {type: Boolean}
    }, {
      forceId: false
    });
    TeamModel = db.define('TeamModel', {
      name: {type: String, length: 255},
      numberOfPlayers: {type: Number},
      sport: {type: String},
      image: {type: Buffer},
      location: {type: GeoPoint}
    }, {
      forceId: true
    });
    MerchantModel = db.define('MerchantModel', {
      merchantId: {type: String, id: true},
      name: {type: String, length: 255},
      countryId: String,
      address: {type: [Object], required: false}
    });

    deleteAllModelInstances(done);
  });

  describe('create document', function() {
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

    it('create a document that has a property named equal to a reserved word', function(done) {
      const id = uuid();

      UserModel.create({
        name: 'Juan Almeida',
        email: 'admin@admin.com',
        realm: true
      }, function(err, res) {
        should.not.exists(err);
        should.exist(res && res.id);
        should.exist(res && res.name);
        should.exist(res && res.email);
        should.exist(res && res.realm);
        done();
      });
    });
  });

  describe('find document', function() {
    beforeEach(function(done) {
      deleteAllModelInstances(done);
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

    it('should support select a field named as a reserved word', function(done) {
      UserModel.create({
        name: 'Juan Almeida',
        email: 'admin@admin.com',
        realm: true
      }, function(err, res) {
        should.not.exists(err);

        UserModel.findOne({
          fields: ['name', 'realm']
        }, function(err, user) {
          should.not.exists(err);
          user.should.have.property('name','Juan Almeida');
          user.should.have.property('realm',true);
          done();
        });
      });
    });

    it('should support find based on a field named as a reserved word', function(done) {
      UserModel.create({
        name: 'Juan Almeida',
        email: 'admin@admin.com',
        realm: true
      }, function(err, res) {
        should.not.exists(err);

        UserModel.find({
          where: {realm: true}
        }, function(err, response) {
          should.not.exists(err);
          response.should.have.property('length',1);
          done();
        });
      });
    });

    it('should support is missing operator', function(done) {
      const countries = [
        {name: 'Ecuador'},
        {name: 'Colombia', countryCode: 'CO'}
      ];
      CountryModel.create(countries, function(err, res) {
        should.not.exists(err);

        CountryModel.find({
          where: {countryCode: 'ismissing'}
        }, function(err, response) {
          should.not.exists(err);
          console.log(response)
          response.length.should.equal(1);
          response[0].name.should.equal('Ecuador');
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

  describe('delete document', function() {
    beforeEach(function(done) {
      deleteAllModelInstances(done);
    });

    it('deleteAll model instances without filter', function(done) {
      CountryModelWithId.create(countries[0], function(err, country) {
        CountryModelWithId.create(countries[1], function(err, country) {
          StudentModel.create({name: 'Juan Almeida', age: 30}, function(err, person) {
            CountryModelWithId.destroyAll(function(err) {
              should.not.exist(err);

              StudentModel.count(function(err, studentsNumber) {
                should.not.exist(err);
                studentsNumber.should.be.equal(1);

                CountryModelWithId.count(function(err, countriesNumber) {
                  should.not.exist(err);
                  countriesNumber.should.be.equal(0);
                  done();
                })
              })
            });
          });
        });
      });
    });

    it('should support where for destroyAll', function(done) {
      CountryModelWithId.create({name: 'Ecuador', countryCode: 'EC'}, function(err, country) {
        CountryModelWithId.create({name: 'Peru', countryCode: 'PE'}, function(err, country) {
          CountryModelWithId.destroyAll({and: [
            {name: 'Ecuador'},
            {countryCode: 'EC'}
          ]}, function(err) {
            should.not.exist(err);
            CountryModelWithId.count(function(err, count) {
              should.not.exist(err);
              count.should.be.equal(1);
              done();
            });
          });
        });
      });
    });

    it('should support where for destroyAll with a reserved word', function(done) {
      UserModel.create({
        name: 'Juan Almeida',
        email: 'admin@admin.com',
        realm: true
      }, function(err, response) {
        should.not.exist(err);
        
        UserModel.destroyAll({
          realm: true
        }, function(err, response) {
          should.not.exist(err);

          UserModel.count(function(err, count) {
            should.not.exist(err);
            count.should.be.equal(0);
            done();
          });
        });
      });
    });

    it('should support destroyById', function(done) {
      const id1 = uuid();
      const id2 = uuid();

      CountryModelWithId.create({id: id1, name: 'Ecuador', countryCode: 'EC'}, function(err, country) {
        CountryModelWithId.create({id: id2, name: 'Peru', countryCode: 'PE'}, function(err, country) {
          CountryModelWithId.destroyById(id1, function(err) {
            should.not.exist(err);
            CountryModelWithId.count(function(err, count) {
              should.not.exist(err);
              count.should.be.equal(1);
              done();
            });
          });
        });
      });
    });
  });

  describe('update document', function() {
    let country, countryId;

    beforeEach(function(done) {
      deleteAllModelInstances(done);
    });

    it('updateAttributes of a document', function(done) {
      const id = uuid();

      CountryModelWithId.create(
        {id: id, name: 'Panama', countryCode: 'PA'}, 
        function(err, country) {
          should.not.exists(err);
          country.name.should.be.equal('Panama');
          country.countryCode.should.be.equal('PA');
          
          country.updateAttributes(
            {name: 'Ecuador', countryCode: 'EC'},
            function(err, response) {
              should.not.exists(err);
              response.name.should.be.equal('Ecuador');
              response.countryCode.should.be.equal('EC');

              CountryModelWithId.findById(id, function(err, response) {
                should.not.exists(err);
                response.name.should.be.equal('Ecuador');
                response.countryCode.should.be.equal('EC');
                done();
              });
          });
      });
    });

    it('updateAttributes of a document with a reserved word', function(done) {
      UserModel.create({
        name: 'Juan Almeida',
        email: 'admin@admin.com',
        realm: true
      }, function(err, user) {
        should.not.exists(err);

        user.updateAttributes({
          realm: false
        }, function(err, response) {
          should.not.exists(err);

          UserModel.findOne(function(err, user) {
            should.not.exists(err);

            user.name.should.be.equal('Juan Almeida');
            user.realm.should.be.false;
            done();
          });
        });
      });      
    });

    it('updateAttribute of a document', function(done) {
      const id = uuid();

      CountryModelWithId.create(
        {id: id, name: 'Panama', countryCode: 'PA'}, 
        function(err, country) {
          should.not.exists(err);
          country.name.should.be.equal('Panama');
          country.countryCode.should.be.equal('PA');
          
          CountryModelWithId.findById(id, function(err, country) {
            should.not.exists(err);
            country.updateAttribute('name', 'Ecuador', function(err, response) {
              should.not.exists(err);
              response.id.should.be.equal(id);
              response.name.should.be.equal('Ecuador');
              response.countryCode.should.be.equal('PA');
              done();
            });
          });
        });
    });

    it('create a document using save', function(done) {
      const id = uuid();

      let newCountry = new CountryModelWithId({
        id: id,
        name: 'Colombia',
        countryCode: 'CO'
      });

      CountryModelWithId.findById(id, function(err, response) {
        should.not.exists(err);
        should.not.exist(response);

        newCountry.save(function(err, instance) {
          should.not.exists(err);
          instance.id.should.be.equal(id);
          instance.name.should.be.equal('Colombia');
          instance.countryCode.should.be.equal('CO');

          CountryModelWithId.findById(id, function(err, response) {
            should.not.exists(err);
            response.id.should.be.equal(id);
            done();
          });
        });
      });
    });

    it('create a document with a reserved word using save', function(done) {
      const id = uuid();

      let newUser = new UserModel({
        name: 'Jobsity',
        email: 'admin@jobsity.io',
        realm: true
      });

      newUser.save(function(err, instance) {
        should.not.exists(err);

        instance.name.should.be.equal('Jobsity');
        instance.email.should.be.equal('admin@jobsity.io');
        instance.realm.should.be.true;

        UserModel.findOne(function(err, response) {
          should.not.exists(err);
          
          response.realm.should.be.true;
          done();
        });
      });
    });

    it('update a document using save', function(done) {
      const id = uuid();

      CountryModelWithId.create({
        id: id,
        name: 'Argentina',
        countryCode: 'AR'
      }, function (err, response) {
        should.not.exists(err);

        CountryModelWithId.findOne({
          where: {id: id}
        }, function(err, country) {
          should.not.exists(err);

          country.countryCode = 'EC';
          country.save(function(err, response) {
            should.not.exists(err);

            CountryModelWithId.findById(id, function(err, response) {
              should.not.exists(err);

              response.id.should.be.equal(id);
              response.name.should.be.equal('Argentina');
              response.countryCode.should.be.equal('EC');
              done();
            })
          })
        })
      })
    });

    it('update a document with a reserved word using save', function(done) {
      const id = uuid();

      UserModel.create({
        name: 'Juan Almeida',
        email: 'admin@admin.com',
        realm: true
      }, function (err, response) {
        should.not.exists(err);

        UserModel.findOne(function(err, user) {
          should.not.exists(err);

          user.realm = false;
          user.save(function(err, response) {
            should.not.exists(err);

            UserModel.findOne(function(err, response) {
              should.not.exists(err);

              response.name.should.be.equal('Juan Almeida');
              response.realm.should.be.false;
              done();
            });
          });
        });
      });
    });

    it('create a document using updateOrCreate', function(done) {
      const id = uuid();

      let newCountry = {
        id: id,
        name: 'Colombia',
        countryCode: 'CO'
      };

      CountryModelWithId.findById(id, function(err, response) {
        should.not.exists(err);
        should.not.exist(response);

        CountryModelWithId.updateOrCreate(newCountry, function(err, instance) {
          should.not.exists(err);

          CountryModelWithId.findById(id, function(err, response) {
            should.not.exists(err);
            response.id.should.be.equal(id);
            done();
          });
        });
      });
    });

    it('update a document using updateOrCreate', function(done) {
      const id = uuid();

      let newCountry = {
        id: id,
        name: 'Colombia',
        countryCode: 'CO'
      };

      let updatedCountry = {
        id: id,
        name: 'Ecuador'
      };

      CountryModelWithId.create(newCountry, function(err, response) {
        should.not.exists(err);

        CountryModelWithId.updateOrCreate(updatedCountry, function(err, instance) {
          should.not.exists(err);

          CountryModelWithId.findById(id, function(err, response) {
            should.not.exists(err);
            response.id.should.be.equal(id);
            response.name.should.be.equal('Ecuador');
            response.countryCode.should.be.equal('CO');
            done();
          });
        });
      });
    });

    it('create a document using replaceOrCreate', function(done) {
      const id = uuid();

      let newCountry = {
        id: id,
        name: 'Colombia',
        countryCode: 'CO'
      };

      CountryModelWithId.findById(id, function(err, response) {
        should.not.exists(err);
        should.not.exist(response);

        CountryModelWithId.replaceOrCreate(newCountry, function(err, instance) {
          should.not.exists(err);

          CountryModelWithId.findById(id, function(err, response) {
            should.not.exists(err);
            response.id.should.be.equal(id);
            done();
          });
        });
      });
    });

    it('update a document using replaceOrCreate', function(done) {
      const id = uuid();

      let newCountry = {
        id: id,
        name: 'Colombia',
        countryCode: 'CO'
      };

      let updatedCountry = {
        id: id,
        name: 'Ecuador'
      };

      CountryModelWithId.create(newCountry, function(err, response) {
        should.not.exists(err);

        CountryModelWithId.replaceOrCreate(updatedCountry, function(err, instance) {
          should.not.exists(err);

          CountryModelWithId.findById(id, function(err, response) {
            should.not.exists(err);
            response.id.should.be.equal(id);
            response.name.should.be.equal('Ecuador');
            should.not.exists(response.countryCode);
            done();
          });
        });
      });
    });

    it('update a document using replaceById', function(done) {
      const id = uuid();

      let newCountry = {
        id: id,
        name: 'Colombia',
        countryCode: 'CO'
      };

      let updatedCountry = {
        id: id,
        name: 'Ecuador'
      };

      CountryModelWithId.create(newCountry, function(err, response) {
        should.not.exists(err);

        CountryModelWithId.replaceById(id, updatedCountry, function(err, instance) {
          should.not.exists(err);

          CountryModelWithId.findById(id, function(err, response) {
            should.not.exists(err);
            response.id.should.be.equal(id);
            response.name.should.be.equal('Ecuador');
            should.not.exists(response.countryCode);
            done();
          });
        });
      });
    });

    it('return affected documents number using updateAll', function(done) {
      const id1 = uuid();

      let newCountry1 = {
        id: id1,
        name: 'Colombia',
        countryCode: 'CO'
      };

      CountryModelWithId.create(newCountry1, function(err, response) {
        should.not.exists(err);

        CountryModelWithId.updateAll({where: {id: id1}}, {name: 'My Country'}, function(err, response) {
          should.not.exists(err);
          response.count.should.be.equal(1);
          done();
        });
      });
    });

    it('update a document using upsertWithWhere', function(done) {
      const id = uuid();

      let newCountry = {
        id: id,
        name: 'Colombia',
        countryCode: 'EC'
      };

      CountryModelWithId.create(newCountry, function(err, response) {
        should.not.exists(err);

        CountryModelWithId.upsertWithWhere({name: 'Colombia'}, {countryCode: 'CO'}, function(err, instance) {
          should.not.exists(err);

          CountryModelWithId.findById(id, function(err, response) {
            should.not.exists(err);
            response.id.should.be.equal(id);
            response.name.should.be.equal('Colombia');
            response.countryCode.should.be.equal('CO');
            done();
          });
        });
      });
    });
  });

  describe('operations with id', function() {
    beforeEach(function(done) {
      deleteAllModelInstances(done);
    });

    it('find by id a model with forceId true', function(done) {
      TeamModel.create({
        name: 'Real Madrid',
        numberOfPlayers: 22,
        sport: 'soccer'
      }, function(err, response) {
        should.not.exists(err);

        const id = response.id;
        TeamModel.findById(id, function(err, team) {
          should.not.exists(err);

          team.id.should.be.equal(id);
          done();
        });
      });
    });

    it('execute operations with a model with custom id', function(done) {
      const id = uuid();
      
      MerchantModel.create({
        merchantId: id,
        name: 'McDonalds',
        countryId: uuid()
      }, function(err, response) {
        should.not.exists(err);

        MerchantModel.findById(id, function(err, merchant) {
          should.not.exists(err);

          merchant.merchantId.should.be.equal(id);
          merchant.name.should.be.equal('McDonalds');
          
          MerchantModel.deleteById(id, function(err, response) {
            should.not.exists(err);

            MerchantModel.count(function(err, count) {
              should.not.exists(err);

              count.should.be.equal(0);
              done();
            });
          });
        });
      });
    });
  });

  describe('cases with special datatypes', function() {

    describe('fields with date', function() {
      beforeEach(function(done) {
        deleteAllModelInstances(done);
      });

      it('find by id a model with forceId true', function(done) {
        CountryModel.create({
          name: 'Ecuador',
          countryCode: 'EC',
          updatedAt: '1990-05-21'
        }, function(err, response) {
          should.not.exists(err);

          CountryModel.findOne(function(err, country) {
            should.not.exists(err);

            country.updatedAt.should.an.instanceOf(Date);
            done();
          });
        });
      });
    });

    describe('fields with date', function() {
      beforeEach(function(done) {
        deleteAllModelInstances(done);
      });

      it('date field should be an instance of Date Object', function(done) {
        CountryModel.create({
          name: 'Ecuador',
          countryCode: 'EC',
          updatedAt: '1990-05-21'
        }, function(err, response) {
          should.not.exists(err);

          CountryModel.findOne(function(err, country) {
            should.not.exists(err);

            country.updatedAt.should.an.instanceOf(Date);
            done();
          });
        });
      });
    });

    describe('tests with special datatypes', function() {
      beforeEach(function(done) {
        deleteAllModelInstances(done);
      });

      it('returns an array of results', function(done) {
        MerchantModel.create({
          name: 'Wallmart',
          countryId: uuid(),
          address: [
            {city: 'Quito', phone: '298221'},
            {city: 'Guayaquil', phone: '33253'}
          ]
        }, function(err, response) {
          should.not.exists(err);

          MerchantModel.create({
            name: 'OpinionShield',
            countryId: uuid(),
            address: [
              {city: 'Ambato', phone: '99857'},
              {city: 'Cuenca', phone: '22588442'}
            ]
          }, function(err, response) {
            should.not.exists(err);

            MerchantModel.find(function(err, response) {
              should.not.exists(err);

              response[0].address.should.an.instanceOf(Array);
              done();
            });
          });
        });
      });

      it('returns an array of results', function(done) {
        const address = ['Quito', 'Guayaquil']
        MerchantModel.create({
          name: 'Wallmart',
          countryId: uuid(),
          address: address
        }, function(err, response) {
          should.not.exists(err);

          MerchantModel.find(function(err, response) {
            should.not.exists(err);

            done();
          });
        });
      });

      it('does not stringify object type field', function(done) {
        StudentModel.create(
          {
            name: 'Juan Almeida',
            age: 30,
            parents: {
              mother: {
                name: 'Alexandra'
              },
              father: {
                name: 'Patricio'
              }
            }
          }, function(err, student) {
            should.not.exists(err);
            
            StudentModel.findOne(function(err, response) {
              should.not.exists(err);

              response.parents.mother.name.should.be.equal('Alexandra');
              done();
            });
          });
      });

      it('stores string and return string on object type field', function(done) {
        StudentModel.create(
          {
            name: 'Juan Almeida',
            age: 30,
            parents: 'myparents'
          }, function(err, student) {
            should.not.exists(err);
            
            StudentModel.findOne(function(err, response) {
              should.not.exists(err);

              response.parents.should.be.equal('myparents');
              done();
            });
          });
      });

      it('stores array and return array on object type field', function(done) {
        let testArray = [
          'item1',
          2,
          true,
          'apple'
        ];
        StudentModel.create(
          {
            name: 'Juan Almeida',
            age: 30,
            parents: testArray
          }, function(err, student) {
            should.not.exists(err);
            
            StudentModel.findOne(function(err, response) {
              should.not.exists(err);

              response.parents.should.be.deepEqual(testArray);
              done();
            });
          });
      });

      it('stores a buffer data type', function(done) {
        const buffer = new Buffer(42);

        TeamModel.create({
          name: 'Real Madrid',
          numberOfPlayers: 22,
          sport: 'soccer',
          image: buffer
        }, function(err, response) {
          should.not.exists(err);

          const id = response.id;
          TeamModel.findById(id, function(err, team) {
            should.not.exists(err);

            team.id.should.be.equal(id);
            team.image.should.an.instanceOf(Buffer);
            team.image.should.be.deepEqual(buffer);
            done();
          });
        });
      });

      it('should always return a buffer object', function(done) {
        TeamModel.create({
          name: 'Real Madrid',
          numberOfPlayers: 22,
          sport: 'soccer',
          image: 'MyImage.jpg'
        }, function(err, response) {
          should.not.exists(err);

          const id = response.id;
          TeamModel.findById(id, function(err, team) {
            should.not.exists(err);

            team.id.should.be.equal(id);
            team.image.should.an.instanceOf(Buffer);
            done();
          });
        });
      });

      it('should always return a geolocation object', function(done) {
        const point = new GeoPoint({
          lat: 31.230416,
          lng: 121.473701,
        });

        TeamModel.create({
          name: 'Real Madrid',
          numberOfPlayers: 22,
          sport: 'soccer',
          location: point
        }, function(err, response) {
          should.not.exists(err);

          const id = response.id;
          TeamModel.findById(id, function(err, team) {
            should.not.exists(err);

            point.lat.should.be.equal(team.location.lat);
            point.lng.should.be.equal(team.location.lng);
            done();
          });
        });
      });
    }); 
  });

  describe('tests for updateDocumentExpiration method', function() {
    beforeEach(function(done) {
      deleteAllModelInstances(done);
    });

    it('should change default document expiry time', function(done) {
      const id = uuid();
      const documentKey = 'CountryModelWithId::' + id;
      const expirationTime = 2;

      let newCountry = {
        id: id,
        name: 'Colombia',
        countryCode: 'CO'
      };

      CountryModelWithId.create(newCountry, function(err, response) {
        should.not.exists(err);

        CountryModelWithId.find(function(err, response) {
          should.not.exists(err);
          response.length.should.be.equal(1);

          CountryModelWithId.getDataSource().connector
          .updateDocumentExpiration(documentKey, expirationTime, {}, function (err, response) {
            should.not.exists(err);

            CountryModelWithId.find(function(err, response) {
              should.not.exists(err);
              response.length.should.be.equal(1);

              setTimeout(function() {
                CountryModelWithId.find(function(err, response) {
                  should.not.exists(err);
                  response.length.should.be.equal(0);
                  done();
                });
              }, 3000);
            });
          });
        });
      });
    });
  });

  function deleteAllModelInstances(callback) {
    const models = [
      CountryModel, CountryModelWithId, 
      StudentModel, TeamModel,
      UserModel, MerchantModel
    ];
    return Promise.all(models.map((m) => {
      return new Promise(function(resolve,reject) {
        m.destroyAll(function(err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      })
    }))
    .then(() => callback(null, true))
    .catch(err => callback(err));
  }

  after(function() {
    //return deleteAllModelInstances();
  })
});
