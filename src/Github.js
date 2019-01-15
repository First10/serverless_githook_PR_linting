const crypto = require('crypto');
const request = require('request');
const octokit = require('@octokit/rest')({debug: true});

module.exports = class GithubConnection {
  constructor(event, callback, GITHUB_API_TOKEN, GITHUB_WEBHOOK_SECRET, credentials, path, targetBranch) {

    this.gitAPIkey = GITHUB_API_TOKEN;
    this.event = event;

    this.credentials = credentials; // ToDo: To be used to talk to aws s3.
    this.token = GITHUB_WEBHOOK_SECRET;
    this.PRBranchName = null;
    this.targetBranch = targetBranch; // ToDo: To be used to lock down merging to develop etc.
    this.PRno = event.body.number;

    this.sha = event.body.pull_request.head.sha;
    this.octokit = octokit;

    let replacePath = (typeof path === 'string') ? path : '';

    this.uri = event.body.repository.contents_url.replace('{+path}', replacePath);

    this.owner = event.body.repository.full_name.split('/')[0];
    this.repo = event.body.repository.full_name.split('/')[1];
    this.developURL = `https://raw.githubusercontent.com/${this.owner}/${this.repo}/develop/`;


    this.authenticateGit();

  }

  get(property) {
    return this[property];
  }

  authenticateGit() {
    this.octokit.authenticate({
      type: 'oauth',
      token: this.gitAPIkey
    });
  }

  getUpdated() {
    const target = {
      uri: `https://api.github.com/repos/${this.owner}/${this.repo}/pulls/${this.PRno}/files`,
      headers: {
        'User-Agent': 'AWS Lambda Function' // Without that Github will reject all requests
      }
    };

    return new Promise((resolve, reject) => {
      const requestCallback = (error, response, body) => {
        if (error) {
          this.callback(error, `Fetching Pull Request from: ${this.repo} failed.`);
        }

        return resolve(JSON.parse(body));
      };

      return request
        .get(target, requestCallback)
        .auth(null, null, true, this.gitAPIkey)
        .on('response', function(response) {
          console.log('response successful');
        });
    })
  }

  /**
   * Takes the event setup in the constructor error handles and authenticates.
   *
   * @returns {Promise}
   */
  processIncommingGitHook() {
    console.log('Processing Incoming githook.');
    let errMsg = null;
    const headers = this.event.headers;
    const sig = headers['X-Hub-Signature'];
    const githubEvent = headers['X-GitHub-Event'];
    const id = headers['X-GitHub-Delivery'];
    const calculatedSig = this.signRequestBody(this.token, this.event.body);

    if (typeof this.token !== 'string') {
      errMsg = 'Must provide a \'GITHUB_WEBHOOK_SECRET\' env variable';
      console.log(errMsg);
      return callback(null, {
        statusCode: 401,
        headers: { 'Content-Type': 'text/plain' },
        body: errMsg,
      });
    }

    if (!sig) {
      errMsg = 'No X-Hub-Signature found on request';
      console.log(errMsg);
      return callback(null, {
        statusCode: 401,
        headers: { 'Content-Type': 'text/plain' },
        body: errMsg,
      });
    }

    if (!githubEvent) {
      errMsg = 'No X-Github-Event found on request';
      console.log(errMsg);
      return callback(null, {
        statusCode: 422,
        headers: { 'Content-Type': 'text/plain' },
        body: errMsg,
      });
    }

    if (!id) {
      errMsg = 'No X-Github-Delivery found on request';
      console.log(errMsg);
      return callback(null, {
        statusCode: 401,
        headers: { 'Content-Type': 'text/plain' },
        body: errMsg,
      });
    }

    if (sig !== calculatedSig) {
      errMsg = 'X-Hub-Signature incorrect. Github webhook token doesn\'t match';
      console.log(errMsg);
      return callback(null, {
        statusCode: 401,
        headers: { 'Content-Type': 'text/plain' },
        body: errMsg,
      });
    }

    /* eslint-disable */
    console.log('---------------------------------');
    console.log(`Github-Event: "${githubEvent}" with action: "${this.event.body.action}"`);
    console.log('---------------------------------');
    console.log('Payload', this.event.body);
    /* eslint-enable */

    return true;
  }

  /**
   * Create a sha1 from the body to compare with the sha1 in the head to make sure
   * this event is legit.
   *
   * @param key {string} api key
   * @param body {object} raw event payload
   * @returns {string}
   */
  signRequestBody(key, body) {
    let hmac = crypto.createHmac("sha1", key);
    hmac.update(JSON.stringify(body), "utf-8");
    return "sha1=" + hmac.digest("hex");
  }

  /**
   *
   * @param type
   * @returns {Promise<any>}
   */
  listGitRepoBranches(type) {
    console.log('Listing branches for gitrepo.');
    console.log('URL: ' + `https://api.github.com/repos/${this.owner}/${this.repo}/branches`);

    const target = {
      uri: `https://api.github.com/repos/${this.owner}/${this.repo}/branches`,
      headers: {
        'User-Agent': 'AWS Lambda Function' // Without that Github will reject all requests
      }
    };

    return new Promise((resolve, reject) => {
      const requestCallback = (error, response, body) => {
        if (error) {
          this.callback(error, `Fetching the branch lists from: ${this.repo} failed.`);
        }

        return resolve(JSON.parse(result));
      };

      return request
        .get(target, requestCallback)
        .auth(null, null, true, this.gitAPIkey)
        .on('response', function(response) {
          // console.log(response.statusCode)
          // console.log(response.headers['content-type']);
        })
    })
  }

  /**
   * Used to fetch individual files from github.
   *
   * @param url {String} Complete url to github raw file.
   * @returns {Promise<any>}
   */
  getFiles(url) {
    const target = {
      uri: url,
      headers: {
        'User-Agent': 'AWS Lambda Function', // Without that Github will reject all requests
        'Authorization': `token ${this.gitAPIkey}`
      },
      dataType: 'jsonp'
    };

    return new Promise((resolve, reject) => {
      const requestCallback = (error, response, body) => {
        if (error) {
          this.callback(error,
            `Fetching the resources from: ${url} failed.`);
        }

        return resolve(body);
      };

      return request
        .get(target, requestCallback)
        .auth(null, null, true, this.gitAPIkey)
        .on('response', function (response) {
          // console.log(url);
          // console.log(response.statusCode) // 200
          // console.log(response.headers['content-type'])
        })

    });
  }


  /**
   *
   * @param branchName
   */
  setPRBranch(branchName) {
    this.PRBranchName = branchName;
  }


  /**
   *
   * @param details {Object} settings to configure status returned to github.
   */
  setStatus(details) {

    // /repos/:owner/:repo/statuses/:sha

    return new Promise((resolvesetStatus, rejectsetStatus) => {
      return this.octokit.repos.createStatus({
        owner: this.owner,
        repo: this.repo,
        sha: this.sha,
        ...details
      })
        .then((res) => {
          console.log('RES: ', res);
          return resolvesetStatus();
        })
        .catch((err) => {
          console.log('Set status error: ', err);
          return rejectsetStatus(err);
        });
    })
  }


};
