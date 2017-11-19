'use strict'

var wj = require('webjerk')
var snaps = require('./plugins/snaps')
var fs = require('fs-extra')

/**
 * @module snapjerk
 */

/**
 * snapjerk.
 * @param {object} opts
 * @param {string} opts.staticDirectory
 * @param {object} opts.snapDefinitions see webjerk-snaps for more
 * @param {function} [opts.snapDefinitionsFromWindow] can be used instead of snap snapDefinitions. see webjerk-snaps for more
 * @param {string[]} [browsers=['chrome']]
 * @returns {Promise}
 */
async function snapjerk (opts) {
  if (!opts.staticDirectory) throw new Error('missing staticDirectory')
  var stat
  try {
    stat = await fs.lstat(opts.staticDirectory)
  } catch (err) {
    console.error(err)
    throw new Error(`static directory ${opts.staticDirectory} is invalid`)
  }
  if (!stat.isDirectory()) throw new Error(`static directory ${opts.staticDirectory} is not a directory`)
  if (!opts.snapDefinitions && !opts.snapDefinitionsFromWindow) {
    throw new Error('snapDefinitions or snapDefinitionsFromWindow required')
  }
  var conf = Object.assign({}, opts)
  conf.browsers = conf.browsers || ['chrome']
  return wj.run({
    plugins: [
      snaps(conf)
    ]
  })
}

module.exports = snapjerk
