import AWS from 'aws-sdk';
import AWSs3 from './AWSs3';

module.exports = class AwsConnection {
  constructor(event, callback, credentials, services) {
    this.AWS = AWS;
    this.services = services;


    this.setupServices();
  }

  setupServices() {

    this.services.map((service) => {

      switch (service.name) {
        case 's3':
          this.AWSs3 = new AWSs3(this.AWS, service);
          break;
      }

    })
  }



};
