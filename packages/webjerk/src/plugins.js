'use strict'

var debug = require('debug')('webjerk:plugins')
var forOwn = require('lodash/forOwn')
var set = require('lodash/set')
var get = require('lodash/get')
var values = require('lodash/values')
var isString = require('lodash/isString')
var isObject = require('lodash/isObject')
var isFunction = require('lodash/isFunction')
var path = require('path')
var lifecycles = ['pre', 'post', 'main']
var bb = require('bluebird')

var pluginCount = 0

function importFunctionFromFile (reg) {
  var isAbs = path.isAbsolute(reg)
  var isRel = reg[0] === '.'
  return (isAbs || !isRel) ? require(reg) : require(path.resolve(process.cwd(), reg))
}

/**
 * Plugins can be strings (to be required) or functions.
 * Plugin register functions create lifecycle hooks for webjerk to run.
 */
var plugins = {
  /**
   * @param {object} config
   * @returns {Promise}
   */
  fromConfig (config) {
    var configPlugins = config.plugins || []
    debug('loading all plugins from configuration')
    return bb.map(
      configPlugins,
      async (pluginDecl, i) => {
        var pluginConfig = {}
        var register
        var name
        if (isObject(pluginDecl)) {
          if (!isFunction(pluginDecl.register)) throw new Error('plugin declaration missing register function')
          register = pluginDecl.register
          pluginConfig = pluginDecl.config || pluginConfig
          name = pluginDecl.name || `unnamed-plugin-${++pluginCount}`
        }
        if (isString(pluginDecl)) {
          register = importFunctionFromFile(pluginDecl)
          name = register.name
          if (!name) {
            throw new Error([
              'plugin register function must be named. ',
              `see plugins[${i}] in your plugins: [ ... ]`
            ].join(''))
          }
        }
        if (!isFunction(register)) return Promise.reject(new Error('plugin did not provide register function'))
        if (!isString(name)) return Promise.reject(new Error('missing plugin name'))
        debug(`registering plugin "${name}"`)
        var plugin = await Promise.resolve(register(config))
        return this.register({ name, plugin, pluginConfig, config })
      },
      { concurrency: 1 }
    )
  },
  getLifecycleHooks ({ config, lifecycle }) {
    return values(get(config, this.lifecycleKey(lifecycle)))
  },
  hookKey ({ lifecycle, name }) {
    return `${this.lifecycleKey(lifecycle)}.${name}`
  },
  lifecycleKey (lifecycle) {
    return `hooks.${lifecycle}`
  },
  register ({ name, plugin, pluginConfig, config }) {
    forOwn(plugin, (hook, lifecycle) => {
      if (lifecycles.indexOf(lifecycle) > -1) this.registerLifecycleHook({ name, plugin, pluginConfig, hook, lifecycle, config })
    })
    return config
  },
  registerLifecycleHook ({ name, plugin, pluginConfig, hook, lifecycle, config }) {
    if (!isFunction(hook)) throw new Error(`key ${lifecycle} must be a lifecycle function`)
    var key = this.hookKey({ lifecycle, name })
    if (get(config, key)) {
      throw new Error(`plugin ${key} already set :(`)
    }
    set(config, key, { fn: hook, config: pluginConfig, plugin, name })
  }
}

module.exports = plugins
