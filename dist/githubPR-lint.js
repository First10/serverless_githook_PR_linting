/**
 * NOTE: This code is transpiled from ES2017 using Babel.
 * Instead of modifying this file directly, work with the source code instead and upload the transpiled output here.
 */'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const DeploymentTools = require('./index');

exports.handler = (() => {
  var _ref = _asyncToGenerator(function* (event, context, callback) {
    const bucketName = process.env.BUCKET;
    const gitHookKey = process.env.GITHUB_WEBHOOK_SECRET;
    const gitAPIkey = process.env.GITHUB_API_TOKEN;

    const config = {
      targetBranch: 'develop'
    };

    event.body = JSON.parse(event.body);
    console.log('Action: ', event.body.action);

    if (event.headers['X-GitHub-Event'] === 'pull_request' && (event.body.action === 'opened' || event.body.action === 'synchronize')) {

      console.log('Init DeploymentTools class');
      const deploymentTools = new DeploymentTools(null, event, callback, bucketName, gitHookKey, gitAPIkey, 'dist', config.targetBranch);

      // Process incoming gitHook event.
      if (deploymentTools.processIncommingGitHook()) {
        const listOfFiles = yield deploymentTools.getUpdated();

        console.log('Sort into types');
        console.log('List of files', JSON.stringify(listOfFiles));

        yield deploymentTools.sortIntoTypes(listOfFiles);
        const filesInfo = deploymentTools.getFileInfo();

        console.log('File info: ', JSON.stringify(filesInfo));

        for (let type of Object.keys(filesInfo)) {
          // Set the PR ro pending while we run the checks.
          yield deploymentTools.setStatus({
            state: 'pending',
            target_url: `https://example.com/build/${type}/status`,
            context: `serverless - ${type}`,
            description: `Running linting checks on ${filesInfo[type].length} ${type} files`
          });
        }

        console.log('Attempt to lint!');

        const lintResults = yield deploymentTools.lint();

        console.log('Check them results!!!! ', JSON.stringify(lintResults));

        if (lintResults.info.totalErrors > 0 || lintResults.info.totalWarnings > 0) {
          Object.keys(lintResults).forEach((() => {
            var _ref2 = _asyncToGenerator(function* (type) {

              console.log('Reporting on type: ', type);

              if (type !== 'info') {
                const warnings = lintResults[type].warnings.length || 0;
                const errors = lintResults[type].errors.length || 0;

                if (errors > 0) {
                  yield deploymentTools.setStatus({
                    state: 'failure',
                    context: `serverless - ${type}`,
                    target_url: `https://example.com/build/${type}/status`,
                    description: `Finished linting ${type} files. Errors: ${errors}. Warnings: ${warnings}`
                  });
                } else if (warnings > 0) {
                  yield deploymentTools.setStatus({
                    state: 'success',
                    context: `serverless - ${type}`,
                    target_url: `https://example.com/build/${type}/status`,
                    description: `Finished linting ${type} files. Warnings: ${warnings}`
                  });
                } else {
                  yield deploymentTools.setStatus({
                    state: 'success',
                    context: `serverless - ${type}`,
                    target_url: `https://example.com/build/${type}/status`,
                    description: `Finished linting ${type} files.`
                  });
                }
              }
            });

            return function (_x4) {
              return _ref2.apply(this, arguments);
            };
          })());
        }

        deploymentTools.closeTask();
      } else {
        const response = {
          statusCode: 200,
          body: {
            input: undefined.event
          }
        };

        return callback(null, JSON.stringify(response));
      }
    } else {
      return callback(null, JSON.stringify({
        statusCode: 404,
        body: {
          input: undefined.event,
          message: `GitHub event: ${event.headers['X-GitHub-Event']}. Event type if any: ${event.body.action}`
        }
      }));
    }
  });

  return function (_x, _x2, _x3) {
    return _ref.apply(this, arguments);
  };
})();