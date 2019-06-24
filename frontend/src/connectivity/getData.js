// Get reports from API gateway
let reportUrl = 'https://vucxbuzmw6.execute-api.eu-west-1.amazonaws.com/dev/reports/get';

export default (options) => {
  const oReq = new XMLHttpRequest();

  return new Promise((yes, no) => {
    let payload = {};

    Object.keys(options).forEach((item, index) => {
      payload[item] = options[item];
    });

    oReq.open('POST', reportUrl, true);
    oReq.responseType = 'json';
    oReq.send(JSON.stringify(payload));

    oReq.onload = function (e) {
      let response = null;
      switch (true) {

        case Array.isArray(e.target.response):
          response = e.target.response;
          break;

        case typeof e.target.response === 'string':
          break;

          case e.target.response.Body.type === 'Buffer':
            response = JSON.parse(Buffer.from(e.target.response.Body).toString('utf8'));
          break;

        default:
      }

      return yes(response);
    };
  });
};
