'use strict'

var defaultsDeep = require('lodash/defaultsDeep')
var snaps = require('webjerk-snaps')
var name = 'webjerk-snaps'
var debug = require('debug')(`webjerk:snapjerk:plugin:${name}`)

module.exports = function (opts) {
  return {
    register: snaps,
    config: Object.assign({
      url: 'http://static:3333',
      snapDefinitions: opts.snapDefinitions,
      snapDefinitionsFromWindow: opts.snapDefinitionsFromWindow,
      staticDirectory: opts.staticDirectory
    }, opts)
  }
}
