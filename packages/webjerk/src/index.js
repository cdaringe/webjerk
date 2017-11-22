'use strict'

var assign = require('lodash/assign')
var lifecycle = require('./lifecycle')
var debug = require('debug')('webjerk:index')

module.exports = {
  async exit (errs) {
    errs = errs || []
    if (!errs.length) return
    if (errs.length > 1) console.error(`webjerk failed with ${errs.length} errors`)
    errs.forEach((err, i) => (err.message = `[${i}] ${err.message}`))
    errs.forEach((err, ndx) => { if (ndx) console.error(err) })
    throw errs[0]
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
