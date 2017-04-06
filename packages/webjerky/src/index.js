'use strict'

var path = require('path')
var wj = require('webjerk')

/**
 * @module webjerky
 */

/**
 * Webjerky.
 * @param {object} conf
 * @param {string} conf.testName
 * @param {string} conf.staticDir
 * @param {string} [conf.sauceUsername] defaults to process.env.SAUCE_USERNAME
 * @param {string} [conf.sauceAccessKey] defaults to process.env.SAUCE_ACCESS_KEY
 * @param {object} conf.snapDefinitions see webjerk-snaps for more
 * @param {function} [conf.snapDefinitionsFromWindow] can be used instead of snap snapDefinitions. see webjerk-snaps for more
 * @returns {Promise}
 */
module.exports = function (conf) {
  if (conf.sauceUsername) process.env.SAUCE_USERNAME = conf.sauceUsername
  if (conf.sauceAccessKey) process.env.SAUCE_ACCESS_KEY = conf.sauceAccessKey
  var { SAUCE_USERNAME, SAUCE_ACCESS_KEY } = process.env
  if (!SAUCE_ACCESS_KEY || !SAUCE_USERNAME) throw new Error('missing sauce credentials')
  if (!conf.testName) throw new Error('missing testName')
  if (!conf.staticDir) throw new Error('missing staticDir')
  var jerkConf = {
    plugins: [
      { register: require('webjerk-saucie') },
      {
        register: require('webjerk-process-wrangler'),
        config: {
          cp: {
            // yes, this bin lookup is fragile!
            bin: path.resolve(__dirname, '..', 'node_modules', '.bin', 'httpster'),
            args: ['-d', conf.staticDir]
          }
        }
      },
      {
        register: require('webjerk-snaps'),
        config: {
          concurrency: 5,
          desiredCapabilities: [
            // {
            //   browserName: 'firefox',
            //   tags: ['webjerk-ff'],
            //   name: conf.testName
            // },
            {
              browserName: 'chrome',
              platform: 'macOS 10.12',
              version: '57.0',
              tags: ['webjerk-chrome'],
              name: conf.testName
            }
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
          port: 4445,
          webdriverio: {
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
        }
      }
    ]
  }
  return wj.run(jerkConf)
}
