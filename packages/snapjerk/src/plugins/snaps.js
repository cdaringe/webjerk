'use strict'

var defaultsDeep = require('lodash/defaultsDeep')
var snaps = require('webjerk-snaps')
var name = 'webjerk-snaps'
var debug = require('debug')(`webjerk:snapjerk:plugin:${name}`)
var freeport = require('freeport')
var util = require('util')

module.exports = async function (opts) {
  var port = process.env.SNAPS_STATIC_PORT || await util.promisify(freeport)()
  return {
    register: snaps,
    config: Object.assign({
      url: `http://static:${port}`,
      snapDefinitions: opts.snapDefinitions,
      snapDefinitionsFromWindow: opts.snapDefinitionsFromWindow,
      staticDirectory: opts.staticDirectory
    }, opts)
  }
}
