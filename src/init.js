const GithubConnection = require('./Github');
const LinterHub = require('./Linter');
const AwsConnection = require('./AWS');
const frontendUrl = 'https://home-pr-reports.s3-eu-west-1.amazonaws.com/';
const { reportFormatter } = require('./utilities');
const ls = require('ls');

exports.handler = async (event, context, callback) => {
  const BUCKET = process.env.BUCKET;
  const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;
  const GITHUB_API_TOKEN = process.env.GITHUB_API_TOKEN;
  const credentials = null;
  const acceptedEvents = ['synchronize', 'opened', 'review_requested'];

  const config = {
    targetBranch: 'develop'
  };

  for (let file of ls(process.cwd() + '/*')) {
    console.log(file.name)
  }


  event.body = JSON.parse(event.body);
  console.log('Action: ', event.body.action);

  // Check we're processing the right kind of webhooks from github.
  if (event.headers['X-GitHub-Event'] === 'pull_request' && acceptedEvents.includes(event.body.action)) {

    console.log('Init DeploymentTools class');
    const githubConnection = new GithubConnection(event, callback, GITHUB_API_TOKEN, GITHUB_WEBHOOK_SECRET, credentials, 'dist', config.targetBranch);
    const linter = new LinterHub(credentials, event, githubConnection);
    const aws = new AwsConnection(event, callback, credentials, [
      {
        name: 's3',
        bucketName: BUCKET
      }
    ]);

    console.log('Githook check', githubConnection.processIncommingGitHook());

    // Process incoming gitHook event, check it's legit and the correct kind of action.
    if (githubConnection.processIncommingGitHook()) {
      const listOfFiles = await githubConnection.getUpdated();

      console.log('Sort into types');
      console.log('List of files', JSON.stringify(listOfFiles));

      // Group the files together so we can pass them to the correct type of linter.
      await linter.sortIntoTypes(listOfFiles);
      const filesInfo = linter.getFileInfo();


      console.log('File info: ', JSON.stringify(filesInfo));
      const fileTypes = Object.keys(filesInfo);
      await linter.getLintingConfig(githubConnection, fileTypes);



        // Set the PR ro pending while we run the checks.
        await githubConnection.setStatus({
          state: 'pending',
          target_url: `${frontendUrl}&event=linting&status=pending`,
          context: `serverless - lints`,
          description: `Running linting checks on edited files`
        });


      console.log('Attempt to lint!');

      const lintResults = await linter.lint();

      // Start the results object with the totals.
      let resultsStats = {
        totals: {
          errors: lintResults.info.totalErrors,
          warnings: lintResults.info.totalWarnings
        }
      };

      console.log('Check the results ', JSON.stringify(lintResults));

      // Create the parameters object for s3.
      const params = aws.AWSs3.prepParams('put', JSON.stringify(lintResults), event.body.pull_request.title, 'json');

      if (lintResults.info.totalErrors > 0 || lintResults.info.totalWarnings > 0) {
        Object.keys(lintResults).forEach((type) => {

          if (type !== 'info') {
            resultsStats[type] = {
              warnings: lintResults[type].warnings.length || 0,
              errors: lintResults[type].errors.length || 0
            }
          }

        });

        // Put the results on s3 as json.
        aws.AWSs3.put(params);
      }

      console.log('resultsStats', resultsStats);

      if (resultsStats.totals.errors > 0 || resultsStats.totals.warnings > 0) {
        const failed = resultsStats.totals.errors > 0;
        const warning = resultsStats.totals.warnings > 0;
        const keyNameNeat = params.Key.replace(/\//g, '%2F').replace(/reports\//, '');
        const fileTypes = Object.keys(resultsStats).join('&');
        delete resultsStats.totals;


        if (failed) {
          // Create a FAIL status with errors and warnings in the message .
          await githubConnection.setStatus({
            state: 'failure',
            context: `serverless - lints`,
            target_url: `${frontendUrl}?event=fail&report=${keyNameNeat}&types=errors`,
            description: `Finished linting. ${reportFormatter(resultsStats)}`
          });
        }

        else if (warning) {
          // Create a SUCCESS status with warnings in the message.
          delete resultsStats.totals;
          await githubConnection.setStatus({
            state: 'success',
            context: `serverless - lints`,
            target_url: `${frontendUrl}?event=success&report=${keyNameNeat}&ext=${fileTypes}&types=warnings`,
            description: `Finished linting. ${reportFormatter(resultsStats)}`
          });
        }

        else {
          // Create a success message.
          delete resultsStats.totals;
          await githubConnection.setStatus({
            state: 'success',
            context: `serverless - lints`,
            target_url: `${frontendUrl}?event=success&report=${keyNameNeat}&ext=${fileTypes}&types=all`,
            description: `Finished linting. ${reportFormatter(resultsStats)}`
          });
        }
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
