'use strict'

var debug = require('debug')
var set = require('lodash/set')
var plugins = require('./plugins')

var results = {}

function executeLifecycleHooks (config, lifecycle) {
  var hooks = plugins.getLifecycleHooks({ config, lifecycle })
  if (!hooks.length) return Promise.resolve()
  return hooks.reduce(
    function chainLifecycleHooks (chain, hook) {
      return chain.then(function execHook () {
        var hookResult = hook.fn.call(hook.plugin, hook.config, config, results)
        return Promise.resolve(hookResult)
        .then(res => { set(results, `${lifecycle}.${hook.plugin.name}`, res) })
      })
    },
    Promise.resolve()
  )
}

module.exports = function registerLifecycle (lifecycle) {
  return function execLifecycle (config) {
    var log = debug(lifecycle)
    var chain = Promise.resolve()
    log(lifecycle)
    if (lifecycle === 'pre') chain = chain.then(() => plugins.fromConfig(config))
    chain = chain.then(() => executeLifecycleHooks(config, lifecycle))
    return chain
  }
}
