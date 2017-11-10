'use strict'

require('perish')
var execa = require('execa')
var fs = require('fs-extra')
var serialize = require('serialize-javascript')
var path = require('path')
var debug = require('debug')('webjerk:snaps-adapter-puppeteer')
var bb = require('bluebird')
var Docker = require('dockerode')
var docker = new Docker()

function deserialize (serializedJavascript) {
  return eval(`(${serializedJavascript})`) // eslint-disable-line
}

async function permitFail (fn) {
  try {
    await Promise.resolve(fn())
  } catch (err) {
    /* pass */
  }
}

module.exports = {
  async capture (conf) {
    var projectRoot = path.resolve(__dirname, '..')
    var serializedConf = serialize(conf)
    await Promise.all(
      (await fs.readdir(__dirname))
      .filter(folder => folder.match(/tmp-/))
      .map(folder => fs.remove(path.join(__dirname, folder)))
    )
    var tempDir = path.resolve(__dirname, `.tmp-${Math.random()}`)
    var tempStaticDir = path.resolve(tempDir, 'static')
    var tempFile = path.join(tempDir, 'capture-config.js')
    var tempSnapsRunDir = path.resolve(tempDir, 'snaps', 'run', Math.random().toString().substr(2))
    await bb.map([tempDir, tempStaticDir, tempSnapsRunDir], dir => fs.mkdirp(dir))
    await fs.copy(conf.staticDirectory, tempStaticDir)
    debug('writing webjerk-snaps conf to disk for docker to pickup', conf)
    await fs.writeFile(tempFile, serializedConf)
    var thisFileRelative = path.relative(projectRoot, __filename)
    var tempDirRelative = path.relative(projectRoot, tempDir)
    var tempFileRelative = path.relative(projectRoot, tempFile)
    var tempSnapsRunDirRelative = path.relative(projectRoot, tempSnapsRunDir)
    // const env = Object.assign({}, process.env, {
    //   ENTRY: thisFileRelative,
    //   PROJECT_ROOT: projectRoot,
    //   RELATIVE_CONFIG_FILE: tempFileRelative,
    //   RELATIVE_RESULTS_DIR: tempDirRelative,
    //   RELATIVE_SNAPS_RUN_DIR: tempSnapsRunDirRelative,
    //   STATIC: tempStaticDir
    // })

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

    var networkName = `snapjerky-${Math.random().toString().substring(2, 10)}`
    var network = await docker.createNetwork({
      Name: networkName
    })
    var staticServer = await docker.createContainer({
      Hostname: 'static',
      Image: 'node',
      Cmd: ['node', '/adapter/node_modules/.bin/httpster', '-d', '/static'],
      HostConfig: {
        Binds: [
          `${projectRoot}:/adapter`,
          `${tempStaticDir}:/static`
        ],
        // PortBindings: {
        //   '3333/tcp': [
        //     {
        //       HostPort: '4444'
        //     }
        //   ]
        // },
        // NetworkMode: networkName
      },
      ExposedPorts: {
        '3333/tcp': {}
      },
      NetworkingConfig: {
        EndpointsConfig: {
          [networkName]: {
            Aliases: [
              'static'
            ]
          }
        }
      }
    })
    var isDebugPup = false
    var puppeteerServer = await docker.createContainer({
      Image: 'zenato/puppeteer-renderer',
      Cmd: isDebugPup
        ? ['node', '--inspect-brk', thisFileRelative]
        : ['node', thisFileRelative],
      AttachStderr: true,
      AttachStdout: true,
      Env: [
        `DEBUG=${process.env.DEBUG}`,
        `STATIC_SERVER_ID=${staticServer.id}`,
        `ENTRY=${thisFileRelative}`,
        `PROJECT_ROOT=${projectRoot}`,
        `RELATIVE_CONFIG_FILE=${tempFileRelative}`,
        `RELATIVE_RESULTS_DIR=${tempDirRelative}`,
        `RELATIVE_SNAPS_RUN_DIR=${tempSnapsRunDirRelative}`,
        `STATIC=${tempStaticDir}`
      ],
      WorkingDir: '/app/adapter',
      HostConfig: {
        Binds: [
          `${projectRoot}:/app/adapter` // image's node_modules are in /app. use 'em
        ],
        PortBindings: {
          '9229/tcp': isDebugPup
            ? [ { HostPort: '9230' } ]
            : []
        },
        NetworkMode: networkName
      },
      ExposedPorts: {
        '9229/tcp': {}
      }
    })
    try {
      await staticServer.start()
      await bb.delay(3000)
      await puppeteerServer.start()
      await puppeteerServer.wait()
      await fs.remove(conf.snapRunRoot)
      debug(`copying \n\t${tempSnapsRunDir}\n\t${conf.snapRunRoot}`)
      await fs.move(tempSnapsRunDir, conf.snapRunRoot)
    } finally {
      debug(`trashing temporary run docker run directory ${tempSnapsRunDir}`)
      await fs.remove(tempDir)
      await Promise.all([
        permitFail(() => staticServer.stop()),
        permitFail(() => puppeteerServer.stop())
      ])
      await Promise.all([
        staticServer.remove(),
        puppeteerServer.remove()
      ])
      await network.remove()
    }
  },
  async dockerCapture () {
    var serializedConf = await fs.readFile(process.env.RELATIVE_CONFIG_FILE)
    var conf = deserialize(serializedConf)
    debug(`deserialized webjerk-snap configuration`, conf)
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
    debug('capturing snaps')
    for (var i in snapDefinitions) {
      var snapDefinition = snapDefinitions[i]
      debug('capturing snap:', snapDefinition.elem)
      await page.waitFor(snapDefinition.elem, {
        timeout: 2000
      })
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
  debug(`webjerk-snaps-adapter-puppeteer execution resumed in docker`)
  module.exports.dockerCapture()
}
