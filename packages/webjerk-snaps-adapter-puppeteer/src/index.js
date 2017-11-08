'use strict'

require('perish')
var execa = require('execa')
var fs = require('fs-extra')
var serialize = require('serialize-javascript')
var path = require('path')
var debug = require('debug')('webjerk-snaps-adapter-puppeteer')
var bb = require('bluebird')

function deserialize (serializedJavascript) {
  return eval(`(${serializedJavascript})`) // eslint-disable-line
}

module.exports = {
  async capture (conf) {
    var projectRoot = path.resolve(__dirname, '..')
    var serializedConf = serialize(conf)
    var tempDir = path.resolve(__dirname, `.tmp-${Math.random()}`)
    var tempStaticDir = path.resolve(tempDir, 'static')
    var tempFile = path.join(tempDir, 'capture-config.js')
    var tempSnapsRunDir = path.resolve(tempDir, 'snaps', 'run', Math.random().toString().substr(2))
    await fs.mkdirp(tempDir)
    await fs.mkdirp(tempStaticDir)
    await fs.mkdirp(tempSnapsRunDir)
    await fs.copy(conf.staticDirectory, tempStaticDir)
    await fs.writeFile(tempFile, serializedConf)
    var thisFileRelative = path.relative(projectRoot, __filename)
    var tempDirRelative = path.relative(projectRoot, tempDir)
    var tempFileRelative = path.relative(projectRoot, tempFile)
    var tempSnapsRunDirRelative = path.relative(projectRoot, tempSnapsRunDir)
    const env = Object.assign({}, process.env, {
      ENTRY: thisFileRelative,
      PROJECT_ROOT: projectRoot,
      RELATIVE_CONFIG_FILE: tempFileRelative,
      RELATIVE_RESULTS_DIR: tempDirRelative,
      RELATIVE_SNAPS_RUN_DIR: tempSnapsRunDirRelative,
      STATIC: tempStaticDir
    })

    /**
     * local puppeteer debuggins only!
     */
    // Object.assign(process.env, {
    //   PROJECT_ROOT: projectRoot,
    //   RELATIVE_SNAPS_RUN_DIR: './',
    //   STATIC: tempStaticDir
    // })
    // conf.url = 'http://localhost:6060'
    // await this.noButSeriouslyCapture(conf)
    // return

    try {
      await execa(
        'docker-compose',
        [
          'up',
          '--exit-code-from', 'puppeteer',
          '--abort-on-container-exit'
        ],
        {
          cwd: projectRoot,
          stdio: 'inherit',
          env
        }
      )
      debug(`copying ${tempSnapsRunDir} ${conf.snapRunRoot}`)
      await fs.remove(conf.snapRunRoot)
      await fs.move(tempSnapsRunDir, conf.snapRunRoot)
    } finally {
      debug(`trashing temporary run docker run directory ${tempSnapsRunDir}`)
      await fs.remove(tempDir)
    }
  },
  async dockerCapture () {
    var serializedConf = await fs.readFile(process.env.RELATIVE_CONFIG_FILE)
    var conf = deserialize(serializedConf)
    return this.noButSeriouslyCapture(conf)
  },
  /**
   *
   * @param {SnapsConfig} conf
   * @returns {Promise}
   */
  async noButSeriouslyCapture (conf) {
    var puppeteer = require('puppeteer') // dynamic require as ppt is not in our code, but in the image's node_modules
    let { snapDefinitions, snapDefinitionsFromWindow } = conf
    const browser = await puppeteer.launch({
      args: ['--no-sandbox']
    })
    const page = await browser.newPage()
    debug(`puppeteer browsing to ${conf.url}`)
    await page.goto(conf.url, { waitUntil: 'networkidle' })
    if (!snapDefinitions && snapDefinitionsFromWindow) {
      snapDefinitions = await page.evaluate(snapDefinitionsFromWindow)
    }
    if (!Array.isArray(snapDefinitions)) throw new Error('no snapDefinitions found')
    var height = await page.evaluate(function () {
      var body = document.body
      var html = document.documentElement
      var height = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight)
      return height
    })
    // TODO remove when https://github.com/GoogleChrome/puppeteer/issues/1315 is closed
    await page.setViewport({
      width: 1000,
      height: height
    })
    for (var i in snapDefinitions) {
      var snapDefinition = snapDefinitions[i]
      await page.waitFor(snapDefinition.elem)
      await bb.delay(400)
      var handle = await page.$(snapDefinition.elem)
      var targetPng = path.join(process.env.RELATIVE_SNAPS_RUN_DIR, `${snapDefinition.name}-chrome.png`)
      debug(`sceenshotting ${snapDefinition.elem} ${targetPng}`)
      await handle.screenshot({
        path: targetPng,
        type: 'png'
      })
    }
    await browser.close()
  }
}

if (require.main === module) {
  module.exports.dockerCapture()
}
