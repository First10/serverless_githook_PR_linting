const AwsConnection = require('./AWS');

exports.handler = (event, context, callback) => {
  const bucketName = process.env.BUCKET;
  const credentials = null;
  console.log('Report Fetcher EVENT: ', event);
  let queryParams = null;

  try {
    queryParams = JSON.parse(event.body);
  }
  catch(err) {
    throw new Error('FAILED TO PARSE BODY. Error: ' + err);
  }

  const aws = new AwsConnection(event, callback, credentials, [
    {
      name: 's3',
      bucketName: bucketName
    }
  ]);

  let request = null;

  switch (queryParams.type) {
    case 'list':
      request = aws.AWSs3.list(aws.AWSs3.prepParams(queryParams.type));
      break;

    case 'get':
      request = aws.AWSs3.get(aws.AWSs3.prepParams(queryParams.type, null, queryParams.name));
      break;

    default:
      throw new Error('Unknown type:' + queryParams.type);

  }

  request.then((res) => {
    console.log('end promise', );
    let response = null;

    switch (queryParams.type) {
      case 'list':
        response = res;
        break;
      case 'get':
        response = Buffer.from(res.Body).toString('utf8');
          break;

      default:
        throw new Error('Unknown type: ' + queryParams.type);
    }

    console.log('response: ', response);
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
