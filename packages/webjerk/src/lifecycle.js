'use strict'

var debug = require('debug')('webjerk:lifecycle')
var set = require('lodash/set')
var plugins = require('./plugins')

async function executeLifecycleHooks (config, lifecycle) {
  var hooks = plugins.getLifecycleHooks({ config, lifecycle })
  var results = {}
  if (!hooks.length) return Promise.resolve()
  for (var i in hooks) {
    var hook = hooks[i]
    try {
      debug(`executing lifecycle "${lifecycle}" on plugin "${hook.plugin.name}"`)
      var hookRes = hook.fn.call(hook.plugin, hook.config, config, results)
      var res = await Promise.resolve(hookRes)
      set(results, `${lifecycle}.${hook.plugin.name}`, res)
    } catch (err) {
      debug(`failed to execute lifecycle ${lifecycle} on plugin "${hook.plugin.name}"`)
      throw err
    }
  }
  return results
}

module.exports = {
  register (lifecycleName) {
    debug(`registering "${lifecycleName}"`)
    return async function execLifecycle (config) {
      if (lifecycleName === 'pre') await plugins.fromConfig(config) // register all plugins
      try {
        await executeLifecycleHooks(config, lifecycleName)
      } catch (err) {
        debug(`failed to execute "${lifecycleName}`)
        throw err
      }
    }
  }
}
