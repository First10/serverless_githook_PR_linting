const DeploymentTools = require('serverless_githook_PR_linting');

exports.handler = async (event, context, callback) => {
  const bucketName = process.env.BUCKET;
  const gitHookKey = process.env.GITHUB_WEBHOOK_SECRET;
  const gitAPIkey = process.env.GITHUB_API_TOKEN;

  const config = {
    targetBranch: 'develop'
  };

  const deploymentTools = new DeploymentTools(null, event, callback, bucketName, gitHookKey, gitAPIkey, 'dist', config.targetBranch);

  // Process incoming gitHook event.
  if (deploymentTools.processIncommingGitHook()) {

    const branchName = await deploymentTools.listGitRepoBranches('get deployed');
    await deploymentTools.setPRBranch(branchName);
    await deploymentTools.getFilesFromGit(branchName);
    await deploymentTools.getListDiffFiles();


    deploymentTools.closeTask();
  }
}
else {
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      input: this.event
    })
  };

  return callback(null, response);
};
