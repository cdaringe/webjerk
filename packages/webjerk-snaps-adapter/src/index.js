'use strict'

var debug = require('debug')('webjerk:snaps-adapter')
var invariant = require('invariant')
var path = require('path')
var fs = require('fs-extra')
var serialize = require('serialize-javascript')
var bb = require('bluebird')
var Docker = require('dockerode')
var execa = require('execa')
var pkgUp = require('pkg-up')
var docker = new Docker()
var url = require('url')

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
    // we need runVolumeDirname to include both:
    // - this package's source
    // - thes used adapter's source
    // in all liklihood, the packages will be siblings, so let's try it :X
    var runVolumeDirname = path.dirname(await pkgUp(path.resolve(__dirname, '..', '..')))
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
    var tempDir = path.resolve(__dirname, `.tmp-${Math.random()}`)
    var tempStaticDirname = path.resolve(tempDir, 'static')
    var tempCaptureConfigFile = path.join(tempDir, 'capture-config.js')
    var tempSnapsRunDir = path.resolve(tempDir, 'snaps', 'run', Math.random().toString().substr(2))
    await bb.map([tempDir, tempStaticDirname, tempSnapsRunDir], dir => fs.mkdirp(dir))
    await fs.copy(conf.staticDirectory, tempStaticDirname)
    debug('writing temporary config to disk for docker to pickup', conf)
    await fs.writeFile(tempCaptureConfigFile, serializedConf)

    var networkName = `snapjerk-${Math.random().toString().substring(2, 10)}`
    var network = await docker.createNetwork({ Name: networkName })
    await this.pullImages()

    // invert control over to docker to resume execution of the snapping process
    let containers = []
    try {
      debug('booting containers')
      containers = await this.bootContainers({
        docker,
        dockerEntrypoint: path.relative(runVolumeDirname, this.conf.adapterFilename),
        networkName,
        port: url.parse(conf.url).port,
        runVolumeDirname,
        tempCaptureConfigFileRelative: path.relative(runVolumeDirname, tempCaptureConfigFile),
        tempSnapsRunDirRelative: path.relative(runVolumeDirname, tempSnapsRunDir),
        tempStaticDirname
      })
      invariant(containers && containers.length, 'bootContainers must provide an array of dockerode containers')
      await fs.remove(conf.snapRunRoot)
      var numRunFiles = (await fs.readdir(tempSnapsRunDir)).length
      debug(`copying ${numRunFiles} files from:\n\t${tempSnapsRunDir} to\n\t${conf.snapRunRoot}`)
      await fs.move(tempSnapsRunDir, conf.snapRunRoot)
    } finally {
      debug(`trashing temporary run docker run directory ${tempSnapsRunDir}`)
      await fs.remove(tempDir)
      await Promise.all(containers.map(container => permitFail(() => container.stop())))
      await network.remove()
    }
  }
  async rehydrate (Adapter) {
    require('perish') // force all adapters to exit on unhandled rejection
    invariant(process.env.RELATIVE_CONFIG_FILE, 'adapter did not set RELATIVE_CONFIG_FILE to deserialize')
    var serializedConf = await fs.readFile(process.env.RELATIVE_CONFIG_FILE)
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
    const { snapDefinitions } = session
    debug('capturing snaps')
    for (var i in snapDefinitions) {
      var snapDefinition = snapDefinitions[i]
      if (snapDefinition.onPreSnap) {
        debug(`onPreSnap: ${snapDefinition.name}`)
        await snapDefinition.onPreSnap(snapDefinition, session, this)
      }
      var targetPngFilename = path.join(process.env.RELATIVE_SNAPS_RUN_DIR, `${snapDefinition.name}-chrome.png`)
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
