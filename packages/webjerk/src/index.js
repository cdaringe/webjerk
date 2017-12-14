'use strict'

var assign = require('lodash/assign')
var lifecycle = require('./lifecycle')
var debug = require('debug')('webjerk:index')

module.exports = {
  async exit (errs) {
    errs = (errs || []).reduce((all, err) => {
      return (err.errors && err.errors.length)
        ? all.concat([err]).concat(err.errors)
        : all.concat([err])
    }, [])
    if (!errs.length) return
    errs.forEach((err, i) => {
      console.error(`[${i}] ${err.code || ''} ${err.message}`)
      // if we didn't emit a user friendly EWEBJERK* error, be loud
      if (!err.code || !err.code.match(/EWEBJERK/)) console.error(err)
    })
    let err = new Error('webjerk pipeline failure. see `.errors`')
    err.code = 'EWEBJERK'
    err.errors = errs
    throw err
  },

  async run (config) {
    if (!config) throw new Error('config missing')
    config = this._config = assign({}, { plugins: [] }, config)
    config.plugins = await Promise.resolve(config.plugins)
    var errs = []
    var results = {}
    var preLifecycleResults
    var mainLifecycleResults
    var postLifecycleResults
    try {
      preLifecycleResults = await lifecycle.register('pre')(config)
      mainLifecycleResults = await lifecycle.register('main')(config)
    } catch (err) {
      errs.push(err) // fail gracefully, allowing post to cleanup
    }
    try {
      postLifecycleResults = await lifecycle.register('post')(config)
    } catch (err) {
      errs.push(err) // fail gracefully, allowing post to cleanup
    }
    Object.assign(results, preLifecycleResults, mainLifecycleResults, postLifecycleResults)
    debug(results)
    this.exit(errs)
  }
}
