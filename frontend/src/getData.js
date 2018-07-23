// Get reports from API gateway
const reportUrl = 'https://qqiyzb9w1d.execute-api.eu-west-1.amazonaws.com/dev/reports/get';

console.log(process.env);


export default (options) => {
  const oReq = new XMLHttpRequest();

  return new Promise((yes, no) => {

    oReq.open('POST', reportUrl, true);
    oReq.responseType = 'json';
    oReq.send();

    oReq.onload = function (e) {
      return yes(e.target.response);
    };
  });
};
