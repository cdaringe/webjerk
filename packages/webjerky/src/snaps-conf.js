'use strict'

var defaultsDeep = require('lodash/defaultsDeep')

module.exports = function getSnapsConfig (conf) {
  var isLocal = conf.localSelenium != null ? conf.localSelenium : !!process.env.WEBJERKY_LOCAL
  return defaultsDeep({}, conf.snaps, {
    concurrency: 5,
    desiredCapabilities: [
      {
        browserName: 'firefox',
        platform: isLocal ? null : 'macOS 10.12',
        version: isLocal ? null : '52',
        tags: ['webjerk-ff'],
        name: conf.testName
      }
      // {
      //   browserName: 'chrome',
      //   platform: 'macOS 10.12',
      //   version: '55.0',
      //   tags: ['webjerk-chrome'],
      //   name: conf.testName
      // }
      // ,
      // {
      //   browserName: 'safari',
      //   tags: ['webjerk-safari'],
      //   name: conf.testName
      // }
      // ,
      // {
      //   browserName: 'MicrosoftEdge',
      //   platform: 'Windows 10',
      //   tags: ['webjerk-edge'],
      //   name: conf.testName
      // },
      // {
      //   browserName: 'internet explorer',
      //   platform: 'Windows 10',
      //   version: '11.103',
      //   tags: ['webjerk-ie'],
      //   name: conf.testName
      // }
    ],
    port: isLocal ? 4444 : 4445,
    webdriverio: isLocal ? null : {
      services: ['sauce'],
      user: process.env.SAUCE_USERNAME,
      key: process.env.SAUCE_ACCESS_KEY
      // https://github.com/webdriverio/webdriverio/issues/1683#issue-186968231
      // further, the below options don't seem to be honored, which is a bummer.
      // that's fine, we can open a tunnel independently
      // sauceConnect: true,
      // sauceConnectOpts: {
      //   verbose: true,
      //   verboseDebugging: true,
      //   username: process.env.SAUCE_USERNAME,
      //   accessKey: process.env.SAUCE_ACCESS_KEY,
      //   tunnelIdentifier: `webjerk-${conf.testName}`
      // }
    },
    url: 'http://localhost:3333', // httpster by default serves on 3333
    testName: conf.testName || 'webjerk-test',
    snapDefinitions: conf.snapDefinitions,
    snapDefinitionsFromWindow: conf.snapDefinitionsFromWindow
  })
}
