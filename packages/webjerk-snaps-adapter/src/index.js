'use strict'

var debug = require('debug')('webjerk:snaps-adapter')
var invariant = require('invariant')
var path = require('path')
var fs = require('fs-extra')
var serialize = require('serialize-javascript')
var bb = require('bluebird')
var Docker = require('dockerode')
var execa = require('execa')
var docker = new Docker()
var url = require('url')
var webpack = require('webpack')
var util = require('util')
const dirTree = require('directory-tree')

class WebjerkSnapsAdapter {
  constructor (conf) {
    invariant(conf, 'missing adapter conf')
    invariant(
      conf.adapterFilename && path.isAbsolute(conf.adapterFilename),
      'missing absolute path adapter filename'
    )
    invariant(conf.browserName, 'missing adapter `browserName`')
    invariant(conf.dockerImageNames, 'missing docker image names')
    invariant(this.captureSnap, 'missing captureSnap method')
    invariant(this.openSession && this.closeSession, [
      'adapter must provide openSession & closeSession methods that launches a',
      'URL and waits for the page to settle'
    ].join(' '))
    this.conf = Object.assign({}, conf)
  }
  deserialize (serializedJavascript) {
    debug(`deserializing:`, serializedJavascript)
    return eval(`(${serializedJavascript})`) // eslint-disable-line
  }
  async capture (conf) {
    var serializedConf = serialize(conf)
    try {
      this.deserialize(serializedConf)
    } catch (err) {
      throw new Error([
        `the configuration you passed cannot be serialized and deserialized.`,
        `this is required such that your configuration may be passed into a`,
        `docker context (i.e. a different process).\n\n${err.message}`
      ].join(' '))
    }
    var runDirname = path.resolve(__dirname, `.tmp-${Math.random()}`)
    var tempStaticDirname = path.resolve(runDirname, 'static')
    var tempCaptureConfigFile = path.join(runDirname, 'capture-config.js')
    var tempSnapsRunDir = path.resolve(runDirname, 'snaps', 'run', Math.random().toString().substr(2))
    await bb.map([runDirname, tempStaticDirname, tempSnapsRunDir], dir => fs.mkdirp(dir))
    await fs.copy(conf.staticDirectory, tempStaticDirname)
    debug('writing temporary config to disk for docker to pickup', conf)
    await fs.writeFile(tempCaptureConfigFile, serializedConf)
    var tempDockerEntryFilename = await this.getEntry({ entry: this.conf.adapterFilename, root: runDirname }) // creates `${runDirname}/entry.js`
    if (debug.enabled) debug(dirTree(runDirname))

    var networkName = `snapjerk-${Math.random().toString().substring(2, 10)}`
    var network = await docker.createNetwork({ Name: networkName })
    await this.pullImages()

    // invert control over to docker to resume execution of the snapping process
    let containers = []
    try {
      debug('booting containers')
      containers = await this.bootContainers({
        docker,
        networkName,
        paths: {
          rootDirname: runDirname,
          relativeToRoot: {
            configFilename: path.relative(runDirname, tempCaptureConfigFile),
            entryFilename: path.relative(runDirname, tempDockerEntryFilename),
            screenshotsDirname: path.relative(runDirname, tempSnapsRunDir),
            staticDirname: path.relative(runDirname, tempStaticDirname)
          }
        },
        port: url.parse(conf.url).port
      })
      invariant(containers && containers.length, 'bootContainers must provide an array of dockerode containers')
      await fs.remove(conf.snapRunRoot)
      var numRunFiles = (await fs.readdir(tempSnapsRunDir)).length
      debug(`copying ${numRunFiles} files from:\n\t${tempSnapsRunDir} to\n\t${conf.snapRunRoot}`)
      await fs.move(tempSnapsRunDir, conf.snapRunRoot)
    } finally {
      debug(`trashing temporary run docker run directory ${tempSnapsRunDir}`)
      await fs.remove(runDirname)
      await Promise.all(containers.map(container => permitFail(() => container.stop())))
      debug('trashing temporary docker network')
      await network.remove()
    }
  }
  async getEntry ({ entry, root }) {
    debug('bunding webjerk-snaps-adapter code for injection into docker container')
    await util.promisify(webpack.bind(webpack))({
      target: 'node',
      externals: [
        function (context, request, cb) {
          return (/^puppeteer$/.test(request))
            ? cb(null, 'commonjs ' + request)
            : cb()
        }
      ],
      entry,
      output: {
        path: root,
        filename: 'entry.js'
      },
      module: {
        rules: [{
          test: /\.(js|jsx|mjs)$/,
          loader: require.resolve('shebang-loader')
        }]
      }
    })
    var entryFilename = path.join(root, 'entry.js')
    if (!(await fs.exists(entryFilename))) {
      throw new Error('entry.js not written')
    }
    debug(`docker entry bundle written to host: ${entryFilename}`)
    return entryFilename
  }
  async rehydrate (Adapter) {
    require('perish') // force all adapters to exit on unhandled rejection
    invariant(process.env.CONFIG_FILENAME, 'adapter did not set CONFIG_FILENAME to deserialize')
    invariant(process.env.SCREENSHOT_DIRNAME, 'adapter did not set SCREENSHOT_DIRNAME')
    var serializedConf = await fs.readFile(process.env.CONFIG_FILENAME)
    debug(`config file in docker detected: ${path.join(process.cwd(), process.env.CONFIG_FILENAME)}`)
    if (debug.enabled) {
      var configDirContents = await fs.readdir(path.dirname(process.env.CONFIG_FILENAME))
      debug(`config dir contents: `, configDirContents)
    }
    var conf = WebjerkSnapsAdapter.prototype.deserialize(serializedConf)
    var adapter = new Adapter(conf)
    adapter.dockerCapture()
  }

  async dockerCapture () {
    debug(`deserialized webjerk-snap configuration`, this.conf)
    const session = await this.openSession(this.conf)
    invariant(
      session && Array.isArray(session.snapDefinitions),
      'openSession must provide a `snapDefinitions` array'
    )
    invariant(
      session.snapDefinitions.length,
      'snapDefinitions must not be empty'
    )
    const { snapDefinitions } = session
    debug('begin capturing snaps')
    for (var i in snapDefinitions) {
      var snapDefinition = snapDefinitions[i]
      if (snapDefinition.onPreSnap) {
        debug(`onPreSnap: ${snapDefinition.name}`)
        await snapDefinition.onPreSnap(snapDefinition, session, this)
      }
      var targetPngFilename = path.join(process.env.SCREENSHOT_DIRNAME, `${snapDefinition.name}-chrome.png`)
      debug(`capturing snap ${snapDefinition.selector} (${targetPngFilename})`)
      await this.captureSnap({
        session,
        snapDefinition,
        targetPngFilename
      })
      if (snapDefinition.onPostSnap) {
        debug(`onPostSnap: ${snapDefinition.name}`)
        await snapDefinition.onPostSnap(snapDefinition, session, this)
      }
    }
    await this.closeSession(session)
  }
  async pullImages () {
    debug('pulling docker images')
    var cpConf = debug.enabled ? { stdio: 'inherit' } : {}
    await Promise.all(this.conf.dockerImageNames.map(image => {
      // @TODO use dockerode.  it was givin me grief.
      return execa('docker', ['pull', image], cpConf)
    }))
    debug(`${this.conf.dockerImageNames.join(', ')} docker images pulled`)
  }
}

async function permitFail (fn) {
  try {
    await Promise.resolve(fn())
  } catch (err) {
    /* pass */
  }
}

module.exports = WebjerkSnapsAdapter
