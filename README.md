# Serverless package version tracking information to SSM

A simple plugin that, when deploying your API, updates SSM Parameter Store with a new version that is semver compliant. Version format is YYYY.MM.DD.RELEASE_NUM_OF_DAY. The aim is to provide an automatic history log of serverless deployments and their versions.

## Configuration

The API versions are updated into SSM using a specific key prefix, which by default is '/app/STAGENAME/versions'. If you want to supply a custom prefix, you can do so by putting the following configuration in your serverless config file:

```yaml
custom:
  ssmApiVersion:
    ssmPrefix: '/my-custom/<stage>/prefix/'
```

The `<stage>` placeholder gets replaced with the stack stage.

## Usage

Simply include the plugin in your serverless project:

```yaml
plugins:
  - serverless-ssm-version-tracker
```

On `sls deploy`, SSM is updated automatically.