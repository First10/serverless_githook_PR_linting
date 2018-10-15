import tools from './utilities';

module.exports = class AwsS3 {
  constructor(AWS, service) {
    this.s3 = new AWS.S3();
    this.bucketName = service.bucketName;
  }

  put(params) {
    return this.s3.putObject(params, function(err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else     console.log(data);           // successful response
    });
  }

  get(params) {
    return new Promise((yes, no) => {
      this.s3.getObject(params, function (err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else console.log('GET DATA: ', data); // successful response
        return yes(data)
      });
    })
  }

  list(params) {
    return new Promise((yes, no) => {
      this.s3.listObjectsV2(params, function(err, response) {
          return yes(response.Contents)
        });

    });
  }

  prepParams(paraType, content, name, outputType) {

    switch (paraType) {
      case 'put':
        return {
          Body: content,
          Bucket: this.bucketName,
          Key: tools.formatGitName('reports/', name, outputType)
        };
      case 'get':
        return {
          Bucket: this.bucketName,
          Key: 'reports/' + name
        };
      case 'list':
        return {
          Bucket: this.bucketName,
          Prefix: 'reports/'
        };
    }
  }

};
