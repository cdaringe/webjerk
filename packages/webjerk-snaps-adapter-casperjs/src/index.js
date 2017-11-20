'use strict'

var path = require('path')
var debug = require('debug')('webjerk:snaps-adapter-casperjs')
var WebjerkSnapsAdapter = require('webjerk-snaps-adapter')
var adapterDirname = path.resolve(__dirname, '..')
var util = require('util')

function pify (method, context) {
  return util.promisify(method).bind(context)
}

class WebjerkSnapsAdapterCasperjs extends WebjerkSnapsAdapter {
  constructor (conf) {
    super(Object.assign(
      {},
      conf,
      {
        adapterFilename: __filename,
        browserName: 'firefox',
        dockerImageNames: [
          'node',
          'docksal/backstopjs'
        ]
      }
    ))
  }

  get casperjs () {
    if (!this._casperjs) {
      // require this dynamically as casperjs is not in our code--it's in the
      // docker image's node_modules.  HACKS! dirty rotten... effecient
      // effective hacks :)
      this._casperjs = require('casperjs')
    }
    return this._casperjs
  }
  async bootContainers (opts) {
    const {
      docker,
      dockerEntrypoint,
      networkName,
      runVolumeDirname,
      tempCaptureConfigFileRelative,
      tempSnapsRunDirRelative,
      tempStaticDirname
    } = opts
    var staticServer = await docker.createContainer({
      Hostname: 'static',
      Image: 'node',
      Cmd: ['node', '/adapter/node_modules/.bin/httpster', '-d', '/static'],
      AttachStderr: debug.enabled,
      AttachStdout: debug.enabled,
      HostConfig: {
        AutoRemove: true,
        Binds: [
          `${adapterDirname}:/adapter`,
          `${tempStaticDirname}:/static`
        ]
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
    var casperjsServer = await docker.createContainer({
      Image: 'docksal/backstopjs',
      Entrypoint: ['node', dockerEntrypoint],
      AttachStderr: debug.enabled,
      AttachStdout: debug.enabled,
      Env: [
        `DEBUG=${process.env.DEBUG}`,
        `STATIC_SERVER_ID=${staticServer.id}`,
        `RELATIVE_CONFIG_FILE=${tempCaptureConfigFileRelative}`,
        `RELATIVE_SNAPS_RUN_DIR=${tempSnapsRunDirRelative}`,
        `STATIC=${tempStaticDirname}`
      ],
      WorkingDir: '/opt/casperjs/adapter',
      HostConfig: {
        AutoRemove: true,
        Binds: [
          `${runVolumeDirname}:/opt/casperjs/adapter` // image's node_modules are in /app. use 'em
        ],
        NetworkMode: networkName
      }
    })
    await staticServer.start()
    await casperjsServer.start()
    staticServer.attach(
      { stream: true, stdout: true, stderr: true },
      (err, stream) => {
        if (err) throw err
        if (debug.enabled) stream.pipe(process.stdout)
      }
    )
    casperjsServer.attach(
      { stream: true, stdout: true, stderr: true },
      (err, stream) => {
        if (err) throw err
        if (debug.enabled) stream.pipe(process.stdout)
      }
    )
    await casperjsServer.wait()
    return [ staticServer, casperjsServer ]
  }
  async openSession (conf) {
    let { snapDefinitions, snapDefinitionsFromWindow } = conf
    var casper = this.casperjs.create({
      verbose: debug.enabled,
      logLevel: debug.enabled ? 'debug' : 'error'
    })
    debug(`casper browsing to ${conf.url}`)
    var casperReady = pify(casper.start, casper)(conf.url)
    var run = casper.run()
    await casperReady
    await pify(casper.wait, casper)(1000)
    if (!snapDefinitions && snapDefinitionsFromWindow) {
      snapDefinitions = await pify(casper.evaluate, casper)(snapDefinitionsFromWindow)
      debug('fetched snapDefintions:', snapDefinitions)
    }
    return { casper, run, snapDefinitions }
  }
  async captureSnap ({
    session: {
      casper
    },
    snapDefinition,
    targetPngFilename
  }) {
    await pify(casper.waitForSelector, casper)(snapDefinition.selector)
    casper.captureSelector(targetPngFilename, snapDefinition.selector)
    await pify(casper.wait, casper)(100) // uhhh? no async control on captureSelector??
  }
  async closeSession ({ run }) {
    await run
  }
}

if (require.main === module) {
  debug(`webjerk-snaps-adapter-casperjs execution resumed in docker`)
  WebjerkSnapsAdapter.prototype.rehydrate(WebjerkSnapsAdapterCasperjs)
}

module.exports = WebjerkSnapsAdapterCasperjs
