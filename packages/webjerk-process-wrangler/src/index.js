'use strict'

var path = require('path')
var fs = require('fs-extra')
var bb = require('bluebird')
var execa = require('execa')
var isNil = require('lodash/isNil')
var debug = require('debug')('webjerk:process-wrangler')

async function ensureProcessIsGone (pid) {
  if (isNil(pid)) return
  var processAlive = true
  while (processAlive) {
    try {
      var killed = process.kill(pid, 0)
      if (killed) processAlive = false
    } catch (err) {
      if (err.code === 'ESRCH') processAlive = false
      throw err
    }
    if (processAlive) {
      debug(`pid ${pid} not dead yet, trying again`)
      await bb.delay(250)
    }
  }
}

function createProcessLifecycleHooks () {
  return {
    _pidFile: null,
    async setup (config) {
      this._pidFile = path.join(process.cwd(), `${path.basename(config.cp.bin)}.pid`)
      debug(`pid file written to: ${this._pidFile}`)
      var exit = function (err, code) {
        fs.removeSync(this._pidFile)
        if (err || code) throw (err || new Error(`${config.cp.bin} exited to boot ${code}`))
      }.bind(this)
      try {
        await fs.remove(this._pidFile)
        var srv = execa(config.cp.bin, config.cp.args || [], config.cp.opts || { cwd: __dirname, stdio: 'inherit' })
        await fs.writeFile(this._pidFile, srv.pid)
        debug(`wrote PID file: ${this._pidFile}`)
        srv.on('error', code => exit(null, code))
        srv.on('exit', code => exit(null, code))
      } catch (err) {
        return exit(err)
      }
    },
    async teardown () {
      debug(`removing pid file ${this._pidFile}`)
      var pid
      try {
        var pidRaw = await fs.readFile(this._pidFile)
        pid = parseInt(pidRaw, 10)
      } catch (err) {
        // pass
      }
      if (!isNil(pid)) {
        debug(`pid ${pid} found. killin it.`)
        await ensureProcessIsGone(pid)
        process.kill(pid, 'SIGTERM')
      }
      await fs.remove(this._pidFile)
    }
  }
}

module.exports = function registerProcessWrangler () {
  var hooks = createProcessLifecycleHooks()
  return {
    name: 'webjerk-process-wrangler',
    pre: hooks.setup,
    post: hooks.teardown
  }
}
