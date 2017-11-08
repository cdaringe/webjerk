'use strict'

var wj = require('webjerk')

// plugins
var snaps = require('./plugins/snaps')

/**
 * @module snapjerk
 */

/**
 * snapjerk.
 * @param {object} conf
 * @param {string} conf.testName
 * @param {string} conf.staticDirectory
 * @param {object} conf.snapDefinitions see webjerk-snaps for more
 * @param {function} [conf.snapDefinitionsFromWindow] can be used instead of snap snapDefinitions. see webjerk-snaps for more
 * @param {string[]} [browsers=['chrome']]
 * @returns {Promise}
 */
function snapjerk (opts) {
  if (!opts.staticDirectory) throw new Error('missing staticDirectory')
  var conf = Object.assign({}, opts)
  conf.browsers = conf.browsers || ['chrome']
  var jerkConf = {
    plugins: [
      snaps(conf)
    ]
  }
  return wj.run(jerkConf)
}

module.exports = snapjerk
