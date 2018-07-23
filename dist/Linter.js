/**
 * NOTE: This code is transpiled from ES2017 using Babel.
 * Instead of modifying this file directly, work with the source code instead and upload the transpiled output here.
 */'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const fs = require('fs');
const Linter = require("eslint").Linter;
const linter = new Linter();

module.exports = class LinterHub {
  constructor(credentials, event, gitConnection) {

    this.event = event;
    this.files = {};
    this.gitConnection = gitConnection;
  }

  /**
   *
   * @param fileList
   * @returns {Promise<any>}
   */
  sortIntoTypes(fileList) {
    var _this = this;

    let count = 0;
    const fileTypes = ['js', 'sass', 'scss', 'json'];

    return new Promise((resolveSort, reject) => {
      fileList.forEach((() => {
        var _ref = _asyncToGenerator(function* (file, index) {
          const fileNameParts = file.filename.split('.');
          const pathParts = file.filename.split('/');
          const type = fileNameParts[fileNameParts.length - 1];

          // Exclude files we're not interested in and don't process bundles.
          if (fileTypes.indexOf(type) !== -1 && file.filename.indexOf('.bundle.') === -1) {

            let fileInfo = {
              filename: pathParts[pathParts.length - 1],
              contents_url: file.contents_url
            };

            if (typeof _this.files[type] === 'undefined') {
              // Creating file type arrays.
              _this.files[type] = [];
            }

            let info = yield _this.gitConnection.getFilesFromGit(file.contents_url, 'raw');
            info = JSON.parse(info);

            fileInfo.download_url = info.download_url;

            // Convert the encoded content from base 64 back into utf8.
            let content = new Buffer(info.content, 'base64');

            // Remove comments form the linting.
            // ToDo: Improve comment linting.
            fileInfo.content = content.toString('utf8').replace(/(\/\/\/.*)|\n$/gm, '');

            console.log('FILE CONTENT', fileInfo.content);

            _this.files[type].push(fileInfo);

            // Write the file to the local tmp folder.
            // fs.writeFile(`/tmp/${fileInfo.filename}`, content, 'base64', function(err) {
            //   if (err) console.log('File writing error: ', err);
            // });
            // console.log(`Wrote /tmp/${fileInfo.filename}`);
          } else {
            console.log('Ignoring type: ', type);
          }

          count++;

          if (count === fileList.length) {
            resolveSort();
          }
        });

        return function (_x, _x2) {
          return _ref.apply(this, arguments);
        };
      })());
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
    var _this2 = this;

    let lintJobs = [];
    let report = {
      info: {
        totalErrors: 0,
        totalWarnings: 0
      }
    };

    Object.keys(this.files).forEach(type => {
      console.log('Beginning lining file type: ' + type);

      this.files[type].forEach((() => {
        var _ref2 = _asyncToGenerator(function* (file) {
          lintJobs.push(_this2.lintSwitch(file, type));
        });

        return function (_x3) {
          return _ref2.apply(this, arguments);
        };
      })());
    });

    return Promise.all(lintJobs).then(values => {

      values.forEach(value => {
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
    }).catch(reason => {
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
    var _this3 = this;

    return new Promise((() => {
      var _ref3 = _asyncToGenerator(function* (resolvelintSwitch, rejectlintSwitch) {
        let results = null;

        switch (type) {
          case 'sass':
          case 'scss':
            results = yield _this3.lintSCSS(file);
            break;

          case 'json':
            results = _this3.lintJSON(file);
            break;

          case 'js':
            results = _this3.lintJS(file);
            break;

          default:
            rejectlintSwitch(new Error('Unknown file type: ' + type));
        }

        return resolvelintSwitch({
          type: type,
          warnings: results.warnings,
          errors: results.errors,
          filename: file.filename
        });
      });

      return function (_x4, _x5) {
        return _ref3.apply(this, arguments);
      };
    })());
  }

  /**
   *
   * @param file
   * @returns {*}
   */
  lintJSON(file) {
    try {
      let testJSON = JSON.parse(file.content);
    } catch (errors) {
      return { warnings: [], errors: [errors], filename: file.filename };
    }

    // Return empty items if there are no errors.
    return { warnings: [], errors: [], filename: file.filename };
  }

  /**
   *
   * @returns {Promise<T>}
   */
  lintSCSS(file) {
    const stylelint = require('stylelint');
    // ToDo: Replace the below with the project rules.
    let rules = require('../.stylelintrc');

    return stylelint.lint({
      config: rules,
      code: file.content
    }).then(function (data) {
      let warnings = [];
      let errors = [];

      data.results.forEach(result => {

        result.warnings.forEach(warning => {
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

      return { warnings, errors, filename: file.filename };
    }).catch(function (err) {
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

    return { warnings, errors, filename: file.filename };
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

    task.stdout.on('data', data => {
      console.log(`stdout: ${data}`);
    });

    task.stderr.on('data', data => {
      console.log(`stderr: ${data}`);
    });

    task.on('close', code => {
      console.log(`child process exited with code ${code}`);
      return resolve();
    });
  }

};