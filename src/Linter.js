const Linter = require("eslint").Linter;
const linter = new Linter();
const npm = require('npm-programmatic');


module.exports = class LinterHub {
  constructor (credentials, event, sourceConnection) {

    this.event = event;
    this.files = {};
    this.sourceConnection = sourceConnection;
    this.lintDependants = {};

  }

  /**
   * Add dependancies for for each file type to lint.
   *
   * @param packages
   * @param type
   */
  lintingDependancies(packages, type) {
    this.lintDependants[type] = [
      new Promise((yes, no) => {
        npm.install(packages, {
          cwd:'/tmp'
        })
          .then(() => {
            console.log('Installed dependencies', packages);
            return yes('Loaded: ' + packages);
          })
          .catch((e) => {
            console.log('Unable to install packages', packages, e);
            no(e);
          })
      })
    ];
  }


  /**
   *
   * @param fileList
   * @returns {Promise<any>}
   */
  sortIntoTypes(fileList) {
    let count = 0;
    const fileTypes = ['js', 'sass', 'scss', 'json'];

    return new Promise((resolveSort, reject) => {
      fileList.forEach(async (file , index) => {
        const fileNameParts = file.filename.split('.');
        const pathParts = file.filename.split('/');
        const type = fileNameParts[fileNameParts.length - 1];

        // Exclude files we're not interested in and don't process bundles.
        if (fileTypes.includes(type) && file.filename.indexOf('.bundle.') === -1) {

          let fileInfo = {
            filename: pathParts[pathParts.length - 1],
            contents_url: file.contents_url
          };

          if (typeof this.files[type] === 'undefined') {
            // Creating file type arrays.
            this.files[type] = [];
          }

          let info = await this.sourceConnection.getFiles(file.contents_url);
          info = JSON.parse(info);

          fileInfo.download_url = info.download_url;

          // Convert the encoded content from base 64 back into utf8.
          let content = new Buffer(info.content, 'base64');

          // Remove comments form the linting.
          // ToDo: Improve comment linting.
          fileInfo.content = content.toString('utf8').replace(/(\/\/\/.*)|\n$/gm, '');

          console.log('FILE CONTENT', fileInfo.content);

          this.files[type].push(fileInfo);

          // Write the file to the local tmp folder.
          // fs.writeFile(`/tmp/${fileInfo.filename}`, content, 'base64', function(err) {
          //   if (err) console.log('File writing error: ', err);
          // });
          // console.log(`Wrote /tmp/${fileInfo.filename}`);
        }
        else {
          console.log('Ignoring type: ', type);
        }

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
          console.log('Values: ', values);
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
          results = await this.lintSCSS(file);
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

      return resolvelintSwitch(
        {
        type: type,
        warnings: results.warnings,
        errors:results.errors,
        filename: file.filename
        }
      );
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
  async lintSCSS(file) {
    const stylelint = require('stylelint');
    // Reduce the config down to just the scss rules etc.
    const config = this.lintConfig.filter(config => config.type === 'scss');



    delete config.type;
    console.log('scss rules', JSON.stringify(config, null, 4));

    // Make sure the packages have been
    if (typeof this.lintDependants.scss !== 'undefined') {
      await Promise.all(this.lintDependants.scss);
    }

    console.log('scss lintDependants', this.lintDependants.scss);


    return stylelint.lint({
      config: config[0].rules, // ToDo: merge rules not just use the first.
      code: file.content
    })
      .then(function(data) {
        let warnings = [];
        let errors = [];

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
    const rules = this.lintConfig.filter(config => config.type === 'js');
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
   * Spawn a task, attach events to capture log outputs and attach the resolve to the end event.
   * Promisesirses spawn tasks basically.
   *
   * @param {function} resolve
   * Resolve callback function from Promise.
   *
   * @param {string} binName
   * Binary path
   *
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

  async getLintingConfig(sourceConnection, fileTypes) {
    const developURL = sourceConnection.get('developURL');
    const configMap = {
      js: ['.eslintrules.json', '.eslintrc.json'],
      scss: ['.stylelintrc.json']
    };
    let configRequests = [];
    let config = [];

    fileTypes.forEach(type => {
      // Try looking for each of the different types of linting rule file names.
      configMap[type].forEach(set => {
        configRequests.push(this.sourceConnection.getFiles(`${developURL}${set}`)
        // Catch any errors caused by fetching the rule files.
        .catch(err => console.log(err))
        )
      })
    });


    configRequests = await Promise.all(configRequests);

    console.log('configRequests: ', configRequests);

    configRequests.forEach((item, index) => {
      // Remove any missing rule sets.
      if (String(item).indexOf('404: Not Found') !== -1) return;
      let rules = null;
      if (typeof item === 'string') {
        try {
          console.log('is a string ', typeof item, item);
          rules = JSON.parse(item);
        }
        catch (err) {
          throw new Error(`Failed to parse json rule set. Error: ${err}.`);
        }
      }
      else {
        console.log('not a string ', typeof item, item);
        rules = item;
      }

      config.push({
        type: fileTypes[index],
        rules: rules
      });
    });

    config.forEach(item => {

        switch (item.type) {

          case 'scss':
            console.log('Loading scss dependencies', item.rules.plugins);
            if (typeof item.rules.plugins !== 'undefined') {
              this.lintingDependancies(item.rules.plugins, 'scss');
            }
            break;

          default:
            console.log('Unknown linting config: ', item);

      }

    });

    console.log('Loaded config', config);

    this.lintConfig = config;

  }

};
