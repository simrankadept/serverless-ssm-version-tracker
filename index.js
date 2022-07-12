'use strict';

// const { exec } = require('child_process');
const AWS = require('aws-sdk');

class ServerlessPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    this.commands = {};

    this.hooks = {
      'after:aws:deploy:deploy:updateStack': this.updateVersionToSsm.bind(this)
    };
  }

  updateVersionToSsm() {
    this.serverless.cli.log('SSM API version: Acquiring info...');
    const { stage, region } = this.options;
    const provider = this.serverless.getProvider('aws');
    const awsCredentials = provider.getCredentials();
    const SSM = new AWS.SSM({
      region,
      credentials: awsCredentials.credentials
    });

    const getSsmParameter = (name) => new Promise((resolve, reject) => {
      var params = {
        Name: name
      };
      SSM.getParameter(params, (err, data) => {
        if (err) {
          this.serverless.cli.log(`get Parameter err is '${err}'`);
          resolve("");
        }
        else {
          this.serverless.cli.log(`get Parameter res is '${data}'`);
          resolve(data);
        }
      });
    });

    const incrementVersion = (version) => {
      console.log("current version is : ", version)
      let currentDate = new Date();
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      const date = currentDate.getDate()
      var newVersion = "".concat(year, ".", month, ".", date, ".", "0")
      if (version && (typeof version === 'string' || version instanceof String) && version.includes('.')) {
        let currentVersionArr = version.split('.')
        if (year == currentVersionArr[0] && month == currentVersionArr[1] && date == currentVersionArr[2]) {
          let dayIncrement = parseInt(currentVersionArr[3]) + 1
          newVersion = "".concat(year, ".", month, ".", date, ".", dayIncrement)
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
        if (err) { reject(err); }
        else { resolve(data); }

      });
    });


    const ssmPrefix = (this.serverless.service.custom
      && this.serverless.service.custom.ssmApiVersion
      && this.serverless.service.custom.ssmApiVersion.ssmPrefix)
      ? this.serverless.service.custom.ssmApiVersion.ssmPrefix.replace(/<stage>/g, stage)
      : `/app/${stage}/versions/`;
    const ssmParameterName = ssmPrefix + this.serverless.service.service;

    getSsmParameter(ssmParameterName)
      .then(value => {
        this.serverless.cli.log(`SSM API version: current version '${value}'`);
        const incrementedVersion = incrementVersion(value.toString())
        this.serverless.cli.log(`SSM API version: Updating new version '${incrementedVersion}' to SSM with key '${ssmParameterName}' at region ${region}`);
        return putSsmParameter(ssmParameterName, incrementedVersion);
      });
  }
}

module.exports = ServerlessPlugin;
