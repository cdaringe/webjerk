'use strict'

var debug = require('debug')('webjerk:snaps-adapter-puppeteer')
var WebjerkSnapsAdapter = require('webjerk-snaps-adapter')

class WebjerkSnapsAdapterPuppeteer extends WebjerkSnapsAdapter {
  constructor (conf) {
    super(Object.assign(
      {},
      conf,
      {
        adapterFilename: __filename,
        browserName: 'chrome',
        dockerImageNames: [
          'cdaringe/httpster',
          'zenato/puppeteer-renderer'
        ]
      }
    ))
  }

  get puppeteer () {
    if (!this._puppeteer) {
      // require this dynamically as puppeteer is not in our code--it's in the
      // docker image's node_modules.  HACKS! dirty rotten... effecient
      // effective hacks :)
      this._puppeteer = require('puppeteer')
    }
    return this._puppeteer
  }
  async bootContainers (opts) {
    const {
      docker,
      dockerEntrypoint,
      networkName,
      port,
      runVolumeDirname,
      tempCaptureConfigFileRelative,
      tempSnapsRunDirRelative,
      tempStaticDirname
    } = opts
    var staticServer = await docker.createContainer({
      Hostname: 'static',
      Image: 'cdaringe/httpster',
      AttachStderr: debug.enabled,
      AttachStdout: debug.enabled,
      HostConfig: {
        AutoRemove: !debug.enabled,
        Binds: [
          `${tempStaticDirname}:/public`
        ],
        PortBindings: Object.assign(
          {},
          debug.enabled
            ? {[`${port}/tcp`]: [{ HostPort: port }]}
            : {}
        )
      },
      ENV: [
        `PORT=${port}`
      ],
      ExposedPorts: {
        [`${port}/tcp`]: {}
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
    debug('static container up')
    var puppeteerServer = await docker.createContainer({
      Image: 'zenato/puppeteer-renderer',
      Cmd: ['node', dockerEntrypoint],
      AttachStderr: debug.enabled,
      AttachStdout: debug.enabled,
      Env: [
        `DEBUG=${process.env.DEBUG}`,
        `STATIC_SERVER_ID=${staticServer.id}`,
        `RELATIVE_CONFIG_FILE=${tempCaptureConfigFileRelative}`,
        `RELATIVE_SNAPS_RUN_DIR=${tempSnapsRunDirRelative}`,
        `STATIC=${tempStaticDirname}`
      ],
      WorkingDir: '/app/adapter',
      HostConfig: {
        AutoRemove: !debug.enabled,
        Binds: [
          `${runVolumeDirname}:/app/adapter` // image's node_modules are in /app. use 'em
        ],
        NetworkMode: networkName
      }
    })
    debug('puppeteer container up')
    await staticServer.start()
    debug('static container up')
    await puppeteerServer.start()
    debug('puppeteer container started')
    staticServer.attach(
      { stream: true, stdout: true, stderr: true },
      (err, stream) => {
        if (err) throw err
        if (debug.enabled) stream.pipe(process.stdout)
      }
    )
    puppeteerServer.attach(
      { stream: true, stdout: true, stderr: true },
      (err, stream) => {
        if (err) throw err
        if (debug.enabled) stream.pipe(process.stdout)
      }
    )
    try {
      await puppeteerServer.wait()
    } catch (err) {
      debug('puppetteer sever failed to capture snaps')
      throw err
    }
    return [ staticServer, puppeteerServer ]
  }
  async openSession (conf) {
    let { snapDefinitions, snapDefinitionsFromWindow } = conf
    const browser = await this.puppeteer.launch({
      args: ['--no-sandbox']
    })
    const page = await browser.newPage()
    debug(`puppeteer browsing to ${conf.url}`)
    await page.goto(conf.url, { waitUntil: 'networkidle2' }) // really? networkidle...2?
    if (!snapDefinitions && snapDefinitionsFromWindow) {
      snapDefinitions = await page.evaluate(snapDefinitionsFromWindow)
    }
    return { browser, page, snapDefinitions }
  }
  async captureSnap ({
    session: {
      page,
      browser
    },
    snapDefinition,
    targetPngFilename
  }) {
    await page.waitFor(snapDefinition.selector, { timeout: 2000 })
    var handle = await page.$(snapDefinition.selector)
    await handle.screenshot({
      path: targetPngFilename,
      type: 'png'
    })
  }
  async closeSession ({ browser }) {
    await browser.close()
  }
}

if (require.main === module) {
  debug(`webjerk-snaps-adapter-puppeteer execution resumed in docker`)
  WebjerkSnapsAdapter.prototype.rehydrate(WebjerkSnapsAdapterPuppeteer)
}

module.exports = WebjerkSnapsAdapterPuppeteer
