'use strict'

var saucie = require('saucie')
var pidFile = 'sc_client.pid'

module.exports = function registerWebjerkSaucie (webjerkconfig) {
  return {
    name: 'webjerk-saucie',
    pre (pluginConfig, webjerkconfig) {
      var SAUCE_USERNAME = process.env.SAUCE_USERNAME
      var SAUCE_ACCESS_KEY = process.env.SAUCE_ACCESS_KEY
      if (!SAUCE_ACCESS_KEY || !SAUCE_USERNAME) throw new Error('SAUCE_ACCESS_KEY & SAUCE_USERNAME must be provided')
      var opts = {
        username: SAUCE_USERNAME,
        accessKey: SAUCE_ACCESS_KEY,
        verbose: true,
        logger: console.log,
        pidfile: pidFile
      }

      var buildNumber = process.env.TRAVIS_JOB_NUMBER || process.env.CI_BUILD_NUMBER || process.env.BUILD_NUMBER
      if (buildNumber) opts.tunnelIdentifier = buildNumber

      return saucie.connect(opts)
    },
    post (pluginConfig, webjerkconfig) {
      return saucie.disconnect(pidFile)
    }
  }
}
