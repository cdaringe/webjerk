'use strict'

var assign = require('lodash/assign')
var lifecycle = require('./lifecycle')

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
    var errs = []

    try {
      await lifecycle('pre')(config)
      await lifecycle('main')(config)
    } catch (err) {
      errs.push(err) // fail gracefully, allowing post to cleanup
    }
    try {
      await lifecycle('post')(config)
    } catch (err) {
      errs.push(err) // fail gracefully, allowing post to cleanup
    }
    this.exit(errs)
  }
}
