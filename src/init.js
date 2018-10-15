const GithubConnection = require('./Github');
const LinterHub = require('./Linter');
const AwsConnection = require('./AWS');
const frontendUrl = 'rcwdl-pr-reports.s3-website-eu-west-1.amazonaws.com';

exports.handler = async (event, context, callback) => {
  const bucketName = process.env.BUCKET;
  const gitHookKey = process.env.GITHUB_WEBHOOK_SECRET;
  const gitAPIkey = process.env.GITHUB_API_TOKEN;
  const credentials = null;

  const config = {
    targetBranch: 'develop'
  };

  event.body = JSON.parse(event.body);
  console.log('Action: ', event.body.action);

  if (event.headers['X-GitHub-Event'] === 'pull_request' && (event.body.action === 'opened' || event.body.action === 'synchronize')) {

    console.log('Init DeploymentTools class');
    const githubConnection = new GithubConnection(event, callback, gitAPIkey, gitHookKey, credentials, 'dist', config.targetBranch);
    const linter = new LinterHub(credentials, event, githubConnection);
    const aws = new AwsConnection(event, callback, credentials, [
      {
        name: 's3',
        bucketName: bucketName
      }
    ]);

    // Process incoming gitHook event.
    if (githubConnection.processIncommingGitHook()) {
      const listOfFiles = await githubConnection.getUpdated();

      console.log('Sort into types');
      console.log('List of files', JSON.stringify(listOfFiles));

      await linter.sortIntoTypes(listOfFiles);
      const filesInfo = linter.getFileInfo();

      console.log('File info: ', JSON.stringify(filesInfo));

      for (let type of Object.keys(filesInfo)) {
        // Set the PR ro pending while we run the checks.
        await githubConnection.setStatus({
          state: 'pending',
          target_url: `${frontendUrl}/build/${type}/status`,
          context: `serverless - ${type}`,
          description: `Running linting checks on ${filesInfo[type].length} ${type} files`
        });
      }

      console.log('Attempt to lint!');

      const lintResults = await linter.lint();

      console.log('Check them results!!!! ', JSON.stringify(lintResults));

      if (lintResults.info.totalErrors > 0 || lintResults.info.totalWarnings > 0) {
        Object.keys(lintResults).forEach(async (type) => {

          console.log('Reporting on type: ', type);

          if (type !== 'info') {
            const warnings = lintResults[type].warnings.length || 0;
            const errors = lintResults[type].errors.length || 0;

            if (errors > 0) {
              await githubConnection.setStatus({
                state: 'failure',
                context: `serverless - ${type}`,
                target_url: `${frontendUrl}/build/${type}/status`,
                description: `Finished linting ${type} files. Errors: ${errors}. Warnings: ${warnings}`
              });
            }

            else if (warnings > 0) {
              await githubConnection.setStatus({
                state: 'success',
                context: `serverless - ${type}`,
                target_url: `${frontendUrl}/build/${type}/status`,
                description: `Finished linting ${type} files. Warnings: ${warnings}`
              });
            }
            else {
              await githubConnection.setStatus({
                state: 'success',
                context: `serverless - ${type}`,
                target_url: `${frontendUrl}/build/${type}/status`,
                description: `Finished linting ${type} files.`
              });
            }
          }

        });

        const params = aws.AWSs3.prepParams('put', JSON.stringify(lintResults), event.body.pull_request.title, 'json');

        // Put the results on s3 as json.
        aws.AWSs3.put(params);
      }

      // Success - report back to lambda
      callback(null, {
        statusCode: 200,
        body: JSON.stringify({
          input: event
        })
      });
    }
    else {
      // If this is isn't a github event we're interested in return everything is fine.
      const response = {
        statusCode: 200,
        body: {
          input: event
        }
      };

      return callback(null, JSON.stringify(response));
    }
  }
  else {
    // If this is isn't a github event we're interested in return everything is fine.
    return callback(null, JSON.stringify({
      statusCode: 404,
      body: {
        input: event,
        message: `GitHub event: ${event.headers['X-GitHub-Event']}. Event type if any: ${event.body.action}`
      }
    }));
  }
};
