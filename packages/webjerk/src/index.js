'use strict'

var assign = require('lodash/assign')
var lifecycle = require('./lifecycle')

module.exports = {
  run (config) {
    if (!config) throw new Error('config missing')
    config = this._config = assign({}, { plugins: [] }, config)
    var errs = []
    function exit () {
      if (!errs.length) return
      if (errs.length > 1) console.error(`webjerk failed with ${errs.length} errors`)
      errs.forEach((err, i) => (err.message = `[${i}] ${err.message}`))
      errs.forEach((err, ndx) => { if (ndx) console.error(err) })
      throw errs[0]
    }
    return Promise.resolve()
    .then(() => lifecycle('pre')(config))
    .then(() => lifecycle('main')(config))
    .catch(err => errs.push(err)) // fail gracefully, allowing post to cleanup
    .then(() => lifecycle('post')(config))
    .catch(err => errs.push(err))
    .then(exit, exit)
  }
}
