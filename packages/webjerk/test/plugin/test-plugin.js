'use strict'

module.exports = function registerDummyPlugin (config) {
  return {
    name: 'test-plugin',
    pre (pluginConf) {},
    post (pluginConf) {}
  }
}
