'use strict'

var isNil = require('lodash/isNil')
var Differ = require('webjerk-image-set-diff')
var fs = require('fs-extra')
var debug = require('debug')('webjerk-snaps')
var path = require('path')

var DEFAULT_WINDOW_EXEC =  function () { return {}; } // eslint-disable-line

/**
 * Run arbitrary code before `snapDefinition.selector` is
 * captured.
 *
 * **WARNING** this code must be serializable, or serialized in
 * advanced.  This is because this code is run by a different process--a docker
 * processes.  Because we execute in a docker context, the docker process is
 * responsible for calling the method.  Therefore, make this code as simple
 * as possible, or if you absolutely must have complexity here (please don't),
 * you can bundle your JS into a string and eval it in.  PRs welcome if folks want
 * to build in rollup/webpack/etc to do this automatically.
 * @callback onPreSnap
 * @param {SnapDefinition} snapDefinition snap definition for element about to be captured
 * @param {string} browserName chrome, firefox, etc
 * @param {*} browserDriver browser adapter used to perform screenshots
 * @returns {Promise} can be async or sync.
 * @example
 * // example: run code in the browser context to ready it for snapping
 * // https://github.com/GoogleChrome/puppeteer/blob/6512ce768ddce790095e2201d8ada3c24407fc57/docs/api.md#pageevaluatepagefunction-args
 * {
 *   selector: '#test',
 *   name: 'test',
 *   onPreSnap: function revealElement (snapDefinition, browserName, browserDriver) {
 *     if (browserName.match(/chrome/i)) {
 *       browserDriver.evaluate(function revealElement (selector) {
 *         return window.myApp.show(selector)
 *       }, snapDefinition.selector)
 *     }
 *   }
 * }
 */

/**
 * Run code after a snap has been captured.
 * See {@link onPreSnap}.
 * @see {@link onPreSnap}
 * @callback onPostSnap
 */

/**
 * @typedef SnapDefinition
 * @property {string} selector css selector for single element to capture
 * @property {string} name basename for .png file
 * @property {onPreSnap} [onPreSnap] run code before a capture
 * @property {onPostSnap} [onPostSnap] run code after a capture
 */

/**
 * Enables executing code at to compute {@link SnapDefintion}s at runtime.
 * @function onSnapDefinitionsFromWindow
 * @returns {Promise}
 */

/**
 * @typedef SnapsConfig
 * @property {string} staticDirectory
 * @property {Number} [runId=Date.now()]
 * @property {string} [url]
 * @property {SnapDefinition[]} [snapDefinitions]
 * @property {onSnapDefinitionsFromWindow} [snapDefinitionsFromWindow]
 * @property {string} [snapRunRoot=`pwd`/snaps/run]
 * @property {string} [snapRefRoot=`pwd`/snaps/ref]
 * @property {boolean} [report=true] generate a static web-application to
 * highlight image changes. report will be placed into snaps/run/<run-id>-diff
 */

/**
 * @module webjerk-snaps
 * @description website visual regression testing plugin.  on webjerk's `main` cycle,
 * webjerk-snaps launches an adapter to _capture_ snaps. after snaps are captured,
 * the image directories (this run's image dir & the reference image dir) are sent to
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
          // adapter: 'webjerk-snaps-adapter-casperjs',
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
      var AdapterCTor = require(this.conf.adapter)
      return new AdapterCTor().capture(this.conf)
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
