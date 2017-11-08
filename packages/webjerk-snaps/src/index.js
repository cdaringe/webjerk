'use strict'

var isNil = require('lodash/isNil')
var Differ = require('webjerk-image-set-diff')
var fs = require('fs-extra')
var debug = require('debug')('webjerk-snaps')
var path = require('path')

var DEFAULT_WINDOW_EXEC =  function () { return {}; } // eslint-disable-line

/**
 * @typedef SnapsConfig
 * @property {Number} [runId=Date.now()]
 * @property {string} staticDirectory
 * @property {string} [url]
 * @property {string[]} [snapDefinitions]
 * @property {function} [snapDefinitionsFromWindow]
 * @property {string} [snapRunRoot=`pwd`/snaps/run]
 * @property {string} [snapRefRoot=`pwd`/snaps/ref]
 */

/**
 * @module webjerk-snaps
 * @description website visual regression testing plugin.  on `main`,
 * webjerk-snaps queues up browsers to be run serially. each browser is
 * launched, screenshots captured. on `post`, the image directories are sent to
 * `webjerk-image-set-diff` for executing the comparison algorithm.
 */
module.exports = function registerSnaps () {
  return Object.assign({}, {
    name: 'snaps',
    /**
     * webjerk main hook
     * @param {SnapsConfig} pluginConfig
     * @param {*} webjerkconfig
     */
    async main (pluginConfig, webjerkconfig) {
      var runId = Date.now().toString()
      this.conf = Object.assign(
        {
          adapter: 'webjerk-snaps-adapter-puppeteer',
          runId,
          snapRunRoot: path.join(process.cwd(), 'snaps', 'run', runId),
          snapRefRoot: path.join(process.cwd(), 'snaps', 'ref')
        },
        pluginConfig
      )
      await Promise.all([
        fs.mkdirp(this.conf.snapRunRoot),
        fs.mkdirp(this.conf.snapRefRoot)
      ])
      debug(`launching adapter ${this.conf.adapter}`)
      return require(this.conf.adapter).capture(this.conf)
    },
    /**
     * webjerk post hook
     * @param {*} pluginConfig
     * @param {*} webjerkconfig
     * @param {*} results
     */
    async post (pluginConfig, webjerkconfig, results) {
      if (!this.conf.snapRunRoot || !(await fs.exists(this.conf.snapRunRoot))) {
        throw new Error('unable to find run images')
      }
      var differ = Differ.factory({
        refDir: this.conf.snapRefRoot,
        runDir: this.conf.snapRunRoot,
        report: isNil(pluginConfig.report) ? true : pluginConfig.report
      })
      return differ.run()
    }
  })
}
