'use strict'

var path = require('path')
var wj = require('webjerk')
var getSnapsConfig = require('./snaps-conf')

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
