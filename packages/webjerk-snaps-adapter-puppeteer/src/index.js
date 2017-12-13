'use strict'

var debug = require('debug')('webjerk:snaps-adapter-puppeteer')
var WebjerkSnapsAdapter = require('webjerk-snaps-adapter')
var path = require('path')

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
      this._puppeteer = require('puppeteer')
    }
    return this._puppeteer
  }
  async bootContainers (opts) {
    const {
      docker,
      networkName,
      paths: {
        rootDirname,
        relativeToRoot: {
          configFilename,
          entryFilename,
          screenshotsDirname,
          staticDirname
        }
      },
      port
    } = opts
    var staticServer

    if (staticDirname) {
      staticServer = await docker.createContainer({
        Hostname: 'static',
        Image: 'cdaringe/httpster',
        AttachStderr: true,
        AttachStdout: true,
        HostConfig: {
          AutoRemove: !debug.enabled,
          Binds: [
            `${path.join(rootDirname, staticDirname)}:/public`
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
    }
    var puppeteerEntryBundle = path.join('/app/snapjerk', entryFilename)
    debug(`instructing puppeteer to load 'node ${puppeteerEntryBundle}' on boot`)
    var puppeteerServer = await docker.createContainer({
      Image: 'zenato/puppeteer-renderer',
      Cmd: ['node', puppeteerEntryBundle],
      AttachStderr: true,
      AttachStdout: true,
      Env: [
        `CONFIG_FILENAME=${path.join('/app/snapjerk', configFilename)}`,
        `SCREENSHOT_DIRNAME=${path.join('/app/snapjerk', screenshotsDirname)}`,
        `DEBUG=${process.env.DEBUG}`
      ],
      WorkingDir: '/app/snapjerk',
      HostConfig: {
        AutoRemove: !debug.enabled,
        Binds: [
          `${rootDirname}:/app/snapjerk` // image's node_modules are in /app. use 'em
        ],
        NetworkMode: networkName
      }
    })
    puppeteerServer.attach(
      { stream: true, stdout: true, stderr: true },
      (err, stream) => {
        if (err) throw err
        if (debug.enabled) {
          debug('piping puppeteer streams to this process')
          puppeteerServer.modem.demuxStream(stream, process.stdout, process.stderr)
        }
      }
    )
    if (staticDirname) {
      staticServer.attach(
        { stream: true, stdout: true, stderr: true },
        (err, stream) => {
          if (err) throw err
          if (debug.enabled) {
            debug('piping static server streams to this process')
            puppeteerServer.modem.demuxStream(stream, process.stdout, process.stderr)
          }
        }
      )
      debug('puppeteer container up')
      await staticServer.start()
      debug('static container up')
    }
    await puppeteerServer.start()
    debug('puppeteer container started')
    try {
      await puppeteerServer.wait()
    } catch (err) {
      debug('puppetteer sever failed to capture snaps')
      throw err
    }
    return [ staticServer, puppeteerServer ].filter(i => i)
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
