'use strict'

var wd = require('webdriverio')
var wdiosc = require('wdio-screenshot')
var isObject = require('lodash/isObject')
var bb = require('bluebird')
var set = require('lodash/set')
var get = require('lodash/get')
var mkdirp = bb.promisify(require('mkdirp'))
var path = require('path')
var Differ = require('webjerk-image-set-diff')

var DEFAULT_WINDOW_EXEC =  function () { return {}; } // eslint-disable-line

/**
 * @module webjerk-snaps
 * @description website visual regression testing plugin.  on `main`,
 * webjerk-snaps queues up browsers to be run serially. each browser is
 * launched, screenshots captured. on `post`, the image directories are sent to
 * `webjerk-image-set-diff` for executing the comparison algorithm.
 */
module.exports = function registerSnaps () {
  return {
    name: 'snaps',
    /**
     * launches a browser and captures screenshots
     * @param {*} webdriverioConf
     * @param {*} pluginConfig
     * @param {*} webjerkconfig
     * @returns {Promise}
     */
    capture (webdriverioConf, pluginConfig, webjerkconfig) {
      var { testName, snapDefinitions, snapDefinitionsFromWindow, url } = pluginConfig
      if (!testName) throw new Error('missing testName')
      if (!snapDefinitions && !snapDefinitionsFromWindow) throw new Error('snapDefinitions or snapDefinitionsFromWindow must be set')
      var client = wd.remote(webdriverioConf)
      wdiosc.init(client)
      console.log(`booting ${webdriverioConf.desiredCapabilities.browserName}`)
      return client
      .init()
      .url(url)
      .execute(snapDefinitionsFromWindow || DEFAULT_WINDOW_EXEC, '<msg>')
      .then(function ({ value }) {
        var browser = `${webdriverioConf.desiredCapabilities.browserName}-${webdriverioConf.desiredCapabilities.version || 'latest'}`
        var snapDefs = snapDefinitionsFromWindow ? value : snapDefinitions
        if (!snapDefs) throw new Error('no snapDefinitions were found')
        var snapRoot = path.resolve(process.cwd(), 'snaps')
        var snapRunRoot = path.resolve(snapRoot, 'runs')
        var snapRefRoot = path.resolve(snapRoot, 'ref')
        var snapRunDir = path.resolve(snapRunRoot, `run-${pluginConfig.runId}`)
        return Promise.resolve()
        .then(() => Promise.all([mkdirp(snapRunDir), mkdirp(snapRefRoot)]))
        .then(() => {
          return snapDefs.reduce((client, sd) => {
            var snapFilename = path.join(snapRunDir, `${sd.name}-${browser}.png`)
            return client.saveElementScreenshot(snapFilename, sd.elem)
          }, client)
        })
        .then(() => client.end())
        .then(() => ({ snapRefRoot, snapRunDir }))
        .catch(err => client.end().then(() => { throw err }))
      })
    },
    /**
     * webjerk main hook
     * @param {*} pluginConfig
     * @param {*} webjerkconfig
     * @param {*} results
     */
    main (pluginConfig, webjerkconfig, results) {
      var capabilities = pluginConfig.desiredCapabilities || [{ browserName: 'chrome' }]
      pluginConfig = pluginConfig || {}
      if (!Array.isArray(capabilities)) capabilities = [capabilities]
      if (!pluginConfig.runId) pluginConfig.runId = Date.now().toString()
      // run each capability, i.e. run each requested browser
      return bb.map(
        capabilities,
        capability => {
          var webdriverioConf = pluginConfig.webdriverio || {}
          if (!isObject(capability)) throw new Error('desiredCapabilities must be an object')
          set(webdriverioConf, 'desiredCapabilities', capability)
          if (!webdriverioConf.desiredCapabilities.browserName) throw new Error('browserName missing')
          return this.capture(webdriverioConf, pluginConfig, webjerkconfig)
        },
        { concurrency: pluginConfig.concurrency || 1 }
      )
    },
    /**
     * webjerk post hook
     * @param {*} pluginConfig
     * @param {*} webjerkconfig
     * @param {*} results
     */
    post (pluginConfig, webjerkconfig, results) {
      var res = get(results, `main[${this.name}]`)
      if (!res || !res.length) return console.error('unable to find run & ref images')
      var { snapRefRoot, snapRunDir } = res[0]
      if (!snapRunDir || !snapRefRoot) throw new Error('expected snapRunDir & snapRefRoot from main results')
      return Differ.factory({ refDir: snapRefRoot, runDir: snapRunDir, report: pluginConfig.report || true }).run()
    }
  }
}
