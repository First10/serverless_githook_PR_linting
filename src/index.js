const crypto = require('crypto');
const request = require('request');
const fs = require('fs');
const Linter = require("eslint").Linter;
const linter = new Linter();
const octokit = require('@octokit/rest')({debug: true});

module.exports = class DeploymentTools {
  constructor (credentials, event, callback, bucketName, gitHookKey, gitAPIkey, path, targetBranch) {
    this.credentials = credentials;
    this.token = gitHookKey;
    this.targetBranch = targetBranch;
    this.PRno = event.body.number;
    this.gitAPIkey = gitAPIkey;
    this.event = event;
    this.callback = callback;
    this.bucketName = bucketName;
    this.files = {};
    this.sha = event.body.pull_request.head.sha;
    this.octokit = octokit;

    let replacePath = (typeof path === 'string') ? path : '';

    this.uri = event.body.repository.contents_url.replace('{+path}', replacePath);

    this.owner = event.body.repository.full_name.split('/')[0];
    this.repo = event.body.repository.full_name.split('/')[1];

    this.authenticateGit();
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
   *
   * @param downloadsUrl
   * @returns {Promise<any>}
   */
  getFilesFromGit(url, source) {
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
   * @param details
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


  /**
   *
   * @param fileList
   * @returns {Promise<any>}
   */
  sortIntoTypes(fileList) {
    let count = 0;
    return new Promise((resolveSort, reject) => {
      fileList.forEach(async (file , index) => {
        const fileNameParts = file.filename.split('.');
        const pathParts = file.filename.split('/');
        const type = fileNameParts[fileNameParts.length - 1];
        let fileInfo = {
          filename: pathParts[pathParts.length - 1],
          contents_url: file.contents_url
        };

        if (typeof this.files[type] === 'undefined') {
          // Creating file type arrays.
          this.files[type] = [];
        }

        let info = await this.getFilesFromGit(file.contents_url, 'raw');
        info = JSON.parse(info);

        fileInfo.download_url = info.download_url;

        // Convert the encoded content from base 64 back into utf8.
        let content = new Buffer(info.content, 'base64');

        fileInfo.content = content.toString('utf8').replace(/\n/, ' \n ');

        this.files[type].push(fileInfo);

        // Write the file to the local tmp folder.
        // fs.writeFile(`/tmp/${fileInfo.filename}`, content, 'base64', function(err) {
        //   if (err) console.log('File writing error: ', err);
        // });
        // console.log(`Wrote /tmp/${fileInfo.filename}`);

        count++;

        if (count === fileList.length) {
          resolveSort();
        }

      });
    });
  }

  getFileInfo() {
    return this.files;
  }


  /**
   *
   * @returns {Promise<{warnings: Array, errors: Array}>}
   */
  lint() {
    let lintJobs = [];
    let report = {
      info: {
        totalErrors: 0,
        totalWarnings: 0
      }
    };

    Object.keys(this.files).forEach((type) => {
      console.log('Beginning lining file type: ' + type);

      this.files[type].forEach(async (file) => {
        lintJobs.push(this.lintSwitch(file, type));
      });

    });

    return Promise.all(lintJobs)
      .then((values) => {

        values.forEach((value) => {
          let type = value.type;

          report[type] = typeof report[type] === 'object' ? report[type] : {};
          report[type].errors = Array.isArray(report[type].errors) ? report[type].errors : [];
          report[type].warnings = Array.isArray(report[type].warnings) ? report[type].warnings : [];

          if (value.errors.length > 0) {
            if (Object.keys(value.errors).length > 0) {
              report[type].errors = report[type].errors.concat({
                filename: value.filename,
                errors: value.errors
              });

              report.info.totalErrors++;
            }
          }
          if (value.warnings.length > 0) {
            if (Object.keys(value.warnings).length > 0) {
              report[type].warnings = report[type].warnings.concat({
                filename: value.filename,
                warnings: value.warnings
              });

              report.info.totalWarnings++;
            }
          }
        });

        return report;
      })
      .catch((reason) => {
        console.log('Linting stopped because of ', reason);
      });

  }


  /**
   *
   * @param file
   * @param type
   * @returns {Promise<any>}
   */
  lintSwitch(file, type) {
    return new Promise(async (resolvelintSwitch, rejectlintSwitch) => {
      let results = null;

      switch (type) {
        case 'sass':
        case 'scss':
          results = await this.lintCSS(file);
          break;

        case 'json':
          results = this.lintJSON(file);
          break;

        case 'js':
          results = this.lintJS(file);
          break;

        default:
          rejectlintSwitch(new Error('Unknown file type: ' + type));

      }

      return resolvelintSwitch({
        type: type,
        warnings: results.warnings,
        errors:results.errors,
        filename: file.filename
      });
    });
  }



  /**
   *
   * @param file
   * @returns {*}
   */
  lintJSON(file) {
    try {
      let testJSON = JSON.parse(file.content);
    }
    catch(errors) {
      return {warnings: [], errors: [errors], filename: file.filename};
    }

    // Return empty items if there are no errors.
    return {warnings: [], errors: [], filename: file.filename}
  }




  /**
   *
   * @returns {Promise<T>}
   */
  lintCSS(file) {
    const stylelint = require('stylelint');
    // ToDo: Replace the below with the project rules.
    let rules = require('../.stylelintrc');

    return stylelint.lint({
      config: rules,
      code: file.content
    })
      .then(function(data) {
        let warnings = [];
        let errors = [];

        if (data.errored) {
          data.results.forEach(result => {

            result.warnings.forEach((warning) => {
              switch (warning.severity) {
                case 'error':
                  errors.push(warning);
                  break;
                case 'warning':
                  warnings.push(warning);
                  break;
              }
            });
          });

          return {warnings, errors, filename: file.filename}
        }
        else {
          return null;
        }

      })
      .catch(function(err) {
        // do things with err e.g.
        console.error(err.stack);
      });
  }



  /**
   *
   * @param file
   * @returns {{warnings: Array, errors: Array, filename: *}}
   */
  lintJS(file) {
    let warnings = [];
    let errors = [];
    // ToDo: Replace the below with the project rules.
    const rules = require('../eslintrules');
    const messages = linter.verify(file.content, rules, { filename: file.filename });

    messages.forEach(message => {

      switch (message.severity) {
        case 1:
          warnings.push(message);
          break;
        case 2:
          errors.push(message);
          break;
        default:
          throw new Error(`Unknown severity type ${message.severity} for file ${file.filename}`);
      }
    });

    return {warnings, errors, filename: file.filename}
  }



  /**
   *
   * @param resolve
   * @param binName
   * @param fileContent
   * @param args
   */
  spawnTask(resolve, binName, fileContent, args) {
    const spawn = require('child_process').spawn;
    const task = spawn(binName, [fileContent, ...args]);
    console.log('spawning job');

    task.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });

    task.stderr.on('data', (data) => {
      console.log(`stderr: ${data}`);
    });

    task.on('close', (code) => {
      console.log(`child process exited with code ${code}`);
      return resolve();
    });
  }



  /**
   *
   * @returns {*}
   */
  closeTask() {
    const response = {
      statusCode: 200,
      body: JSON.stringify({
        input: this.event
      })
    };

    return this.callback(null, response);
  }
};
