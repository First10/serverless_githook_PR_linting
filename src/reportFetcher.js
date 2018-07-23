const AwsConnection = require('./AWS');

exports.handler = (event, context, callback) => {
  const bucketName = process.env.BUCKET;
  const credentials = null;

  const aws = new AwsConnection(event, callback, credentials, [
    {
      name: 's3',
      bucketName: bucketName
    }
  ]);

  const params = aws.AWSs3.prepParams('list');

  const test = aws.AWSs3.list(params);

  test.then((res) => {
    console.log('end promise', res);
    // Success - report back to lambda
    callback(null, {
      statusCode: 200,
      headers: {
        "Cache-Control": "maAccess-Control-Allow-Methodsx-age=31536000",
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", // Required for CORS support to work
        "Access-Control-Allow-Methods": "GET, OPTIONS, POST",
        "Access-Control-Allow-Headers": "Content-Type",
        "Accept-Encoding": "identity",
        "Access-Control-Allow-Credentials": true // Required for cookies, authorization headers with HTTPS
      },
      body: JSON.stringify(res)
    });

  })
    .catch((err) => {
      console.log(err);
    })
};
