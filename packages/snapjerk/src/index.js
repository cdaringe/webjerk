'use strict'

var path = require('path')
var wj = require('webjerk')
var getSnapsConfig = require('./snaps-conf')
var pwrangle = require('webjerk-process-wrangler')

/**
 * @module webjerky
 */

/**
 * Webjerky.
 * @param {object} conf
 * @param {string} conf.testName
 * @param {string} conf.staticDir
 * @param {boolean} [conf.localSelenium] use a local selenium instance vs saucelabs. WEBJERKY_LOCAL may be used too from the env.
 * @param {string} [conf.sauceUsername] defaults to process.env.SAUCE_USERNAME
 * @param {string} [conf.sauceAccessKey] defaults to process.env.SAUCE_ACCESS_KEY
 * @param {object} conf.snapDefinitions see webjerk-snaps for more
 * @param {function} [conf.snapDefinitionsFromWindow] can be used instead of snap snapDefinitions. see webjerk-snaps for more
 * @returns {Promise}
 */
module.exports = function (conf) {
  var isLocal = conf.localSelenium != null ? conf.localSelenium : !!process.env.WEBJERKY_LOCAL
  if (!isLocal) {
    if (conf.sauceUsername) process.env.SAUCE_USERNAME = conf.sauceUsername
    if (conf.sauceAccessKey) process.env.SAUCE_ACCESS_KEY = conf.sauceAccessKey
    var { SAUCE_USERNAME, SAUCE_ACCESS_KEY } = process.env
    if (!SAUCE_ACCESS_KEY || !SAUCE_USERNAME) throw new Error('missing sauce credentials')
  }
  if (!conf.testName) throw new Error('missing testName')
  if (!conf.staticDir) throw new Error('missing staticDir')
  var jerkConf = {
    plugins: [
      (isLocal
        ? { name: 'selenium', register: pwrangle, config: { cp: { bin: 'selenium-standalone', args: ['start'] } } }
        : { register: require('webjerk-saucie') }
      ),
      {
        register: pwrangle,
        config: {
          cp: {
            bin: path.resolve(__dirname, '..', 'node_modules', '.bin', 'httpster'), // yes, this bin lookup is fragile!
            args: ['-d', conf.staticDir]
          }
        }
      },
      {
        register: require('webjerk-snaps'),
        config: getSnapsConfig(conf)
      }
    ]
  }
  return wj.run(jerkConf)
}
