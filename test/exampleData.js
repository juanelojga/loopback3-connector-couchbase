'use strict';

const countries = [
  {
    'gdp': 40214,
    'countryCode': 'AD',
    'name': 'Andorra',
    'population': 80792,
    'updatedAt': '1987-10-01T07:35:13'
   },
   {
    'gdp': 13448,
    'countryCode': 'HR',
    'name': 'Croatia',
    'population': 4254921.0,
    'updatedAt': '2006-01-02T15:04:05.567+08:00'
  },
  {
    'gdp': 65223,
    'countryCode': 'EC',
    'name': 'Ecuador',
    'population': 16202365,
    'updatedAt': '1990-05-06T00:04:05.567+08:00'
  }
];

module.exports = {
	countries
};

// const couchbase = require('couchbase');
// const uuid = require('uuid/v4');
// const _ = require('lodash');

// const init = require('./init.js');

// const n1qlQuery = couchbase.N1qlQuery;

// function migrateData(cb) {
//   const url = 'couchbase://' + init.config.host + ':' + init.config.port + '?operation_timeout=20';
//   const cluster = new couchbase.Cluster(url);

//   const bucket = cluster.openBucket(init.config.bucket, init.config.password, function(err) {
//     console.log(init.config.bucket + ' bucket open');
//   });

//   function insertData(modelName, collection) {
//     _.forEach(collection, function(doc) {
//       const docId = modelName + '::' + uuid();
//       bucket.insert(docId, doc, function(err, rows) {
//         if (err) {
//           console.log(err);
//         }
//         console.log(rows);
//       });
//     });
//   }

//   const countries = [
//     {
//       'gdp': 40214,
//       'region-number': 39,
//       'countryCode': 'AD',
//       'name': 'Andorra',
//       'type': 'Country',
//       'updated': '2015-10-01T07:35:13',
//       'population': 80792
//     },
//     {
//       'gdp': 13448,
//       'region-number': 39,
//       'countryCode': 'HR',
//       'name': 'Croatia',
//       'type': 'Country',
//       'updated': '2015-09-18T15:45:25',
//       'population': 4254921.0
//     }
//   ];

//   const userprofiles = [
//     {
//       'lastName': 'Saarinen',
//       'address': {
//         'state': 'south karelia',
//         'city': 'ii',
//         'countryCode': 'HR',
//         'street': '2447 nordenskiöldinkatu',
//         'postalCode': 91907
//       },
//       'gender': 'male',
//       'created': '2015-05-07T04:44:22',
//       'phones': [
//         {
//           'verified': '2015-03-13T10:02:39',
//           'type': 'home',
//           'number': '05-062-969'
//         }
//       ],
//       'dateOfBirth': '1985-02-08',
//       'title': 'Mr',
//       'type': 'UserProfile',
//       'picture': {
//         'large': 'https://randomuser.me/api/portraits/men/73.jpg',
//         'thumbnail':'https://randomuser.me/api/portraits/thumb/men/73.jpg',
//         'medium':'https://randomuser.me/api/portraits/med/men/73.jpg'
//       },
//       'firstName': 'Konsta',
//       'favoriteGenres': [
//         'Folk',
//         'Indie Rock',
//         'Latin Hip Hop',
//         'Jazz',
//         'Ethnic Fusion New Age',
//         'Heartland Rock',
//         'Acid Jazz'
//       ],
//       'pwd': '796f756e6731',
//       'updated': '2015-08-25T10:27:40',
//       'email': 'konsta.saarinen@cox.net',
//       'status': 'active',
//       'username': 'abbotsdeclarative8362'
//     },
//     {
//       'lastName': 'Lacroix',
//       'address': {
//         'state': 'territoire de belfort',
//         'city': 'montreuil',
//         'countryCode': 'HR',
//         'street': '6358 rue de labbé-soulange-bodin',
//         'postalCode': 80298
//       },
//       'gender': 'female',
//       'created': '2015-07-04T04:22:55',
//       'phones': [
//         {
//           'verified': '2015-04-28T10:02:39',
//           'type': 'home',
//           'number': '01-24-58-64-33'
//         }
//       ],
//       'dateOfBirth': '1977-02-28',
//       'title': 'Ms',
//       'type': 'UserProfile',
//       'picture': {
//         'large': 'https://randomuser.me/api/portraits/women/70.jpg',
//         'thumbnail': 'https://randomuser.me/api/portraits/thumb/women/70.jpg',
//         'medium': 'https://randomuser.me/api/portraits/med/women/70.jpg'
//       },
//       'firstName': 'Maélie',
//       'favoriteGenres': [
//         'Merseybeat',
//         'Delta Blues',
//         'Celtic New Age',
//         'Swing',
//         'Folk Blues',
//         'Roots Rock'
//       ],
//       'pwd': '7a657573',
//       'updated': '2015-08-25T10:29:28',
//       'email': 'maélie.lacroix@hotmail.com',
//       'status': 'active',
//       'username': 'jiujitsugrouting67031'
//     }
//   ];

//   insertData('Country', countries);
//   insertData('UserProfile', userprofiles);

//   process.exit(0);
// }

// migrateData();
