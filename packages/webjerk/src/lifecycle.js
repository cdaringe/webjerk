'use strict'

var debug = require('debug')('webjerk:lifecycle')
var set = require('lodash/set')
var plugins = require('./plugins')

var results = {}

async function executeLifecycleHooks (config, lifecycle) {
  var hooks = plugins.getLifecycleHooks({ config, lifecycle })
  if (!hooks.length) return Promise.resolve()
  for (var i in hooks) {
    var hook = hooks[i]
    try {
      debug(`executing lifecycle ${lifecycle} on plugin "${hook.plugin.name}"`)
      var res = await Promise.resolve(hook.fn.call(hook.plugin, hook.config, config, results))
      set(results, `${lifecycle}.${hook.plugin.name}`, res)
    } catch (err) {
      debug(`failed to execute lifecycle ${lifecycle} on plugin "${hook.plugin.name}"`)
      throw err
    }
  }
}

module.exports = function registerLifecycle (lifecycle) {
  debug(`registering "${lifecycle}"`)
  return async function execLifecycle (config) {
    debug(`executing "${lifecycle}"`)
    if (lifecycle === 'pre') await plugins.fromConfig(config) // register all plugins
    try {
      await executeLifecycleHooks(config, lifecycle)
    } catch (err) {
      debug(`failed to execute "${lifecycle}`)
      throw err
    }
  }
}
