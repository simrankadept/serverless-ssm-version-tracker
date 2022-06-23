'use strict';

const { exec } = require('child_process');
const AWS = require('aws-sdk');
//const isSemver = require("is-semver");


// const promisexec = (command) => new Promise((resolve, reject) => {
//   exec(command, (error, stdout, stderr) => {
//     if (error) {reject(new Error(error));}
//     else if (stderr) {reject(new Error(stderr));}
//     else {resolve(stdout.trim());}
//   });
// });

class ServerlessPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    this.commands = {};

    this.hooks = {
      'after:aws:deploy:deploy:updateStack': this.updateGitDescriptionToSsm.bind(this)
    };
  }

  updateGitDescriptionToSsm() {
    this.serverless.cli.log('SSM API git version: Acquiring git description...');

    const stage = this.options.stage;
    const region = this.options.region;

    const SSM = new AWS.SSM({ region });

    const getSsmParameter = (name) => new Promise((resolve, reject) => {
      var params = {
        Name: name
     };
      SSM.getParameter(params, (err, data) => {
        if (err) {resolve("");}
        else {resolve(data);}
      });
    });

    const incrementVersion = (version) => {
      console.log("current version is : ", version)
      let currentDate =  new Date();
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      const date = currentDate.getDate()
      var newVersion = "".concat(year, ".", month , ".",  date, ".", "0")
      //&& isSemver(version)
      if(version && version.contains('.')){
         let currentVersionArr = version.split('.')
         if(year == currentVersionArr[0] && month ==currentVersionArr[1] && date  == currentVersionArr[2] ){
          let dayIncrement = parseInt(currentVersionArr[3]) + 1
          newVersion =  "".concat(year, ".", month , ".",  date, ".", dayIncrement)
         }
      }
      return newVersion

    }

    const putSsmParameter = (name, value) => new Promise((resolve, reject) => {
      var params = {
        Name: name,
        Type: 'String',
        Value: value,
        Overwrite: true
      };
      SSM.putParameter(params, (err, data) => {
        if (err) {reject(err);}
        else {resolve(data);}
      });
    });


    const ssmPrefix = (this.serverless.service.custom
      && this.serverless.service.custom.ssmApiGitVersion
      && this.serverless.service.custom.ssmApiGitVersion.ssmPrefix)
        ? this.serverless.service.custom.ssmApiGitVersion.ssmPrefix.replace(/<stage>/g, stage)
        : `/app/${stage}/versions`;
      const ssmname = ssmPrefix + this.serverless.service.service;

      getSsmParameter(ssmname)
      .then(value => {
        const incrementedVersion = incrementVersion(value.toString())
        this.serverless.cli.log(`SSM API git version: Updating new version '${incrementedVersion}' to SSM with key '${ssmname}' at region ${region}`);
        process.env['INCREMENTED_VERSION'] = incrementedVersion
        return putSsmParameter(ssmname, incrementedVersion);
      });
  }
}

module.exports = ServerlessPlugin;
