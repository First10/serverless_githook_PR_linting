/**
 * NOTE: This code is transpiled from ES2017 using Babel.
 * Instead of modifying this file directly, work with the source code instead and upload the transpiled output here.
 */'use strict';

var _awsSdk = require('aws-sdk');

var _awsSdk2 = _interopRequireDefault(_awsSdk);

var _AWSs = require('./AWSs3');

var _AWSs2 = _interopRequireDefault(_AWSs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = class AwsConnection {
  constructor(event, callback, credentials, services) {
    this.AWS = _awsSdk2.default;
    this.services = services;

    this.setupServices();
  }

  setupServices() {

    this.services.map(service => {

      switch (service.name) {
        case 's3':
          this.AWSs3 = new _AWSs2.default(this.AWS, service);
          break;
      }
    });
  }

};