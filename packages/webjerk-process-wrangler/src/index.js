'use strict'

var path = require('path')
var fs = require('fs-extra')
var bb = require('bluebird')
var execa = require('execa')

async function ensureProcessIsGone (pid) {
  var processAlive = true
  while (processAlive) {
    try {
      process.kill(pid, 0)
    } catch (err) {
      if (err.code === 'ESRCH') processAlive = false
      throw err
    }
    if (processAlive) await bb.delay(250)
  }
}

function createProcessLifecycleHooks () {
  return {
    _pidFile: null,
    async setup (config) {
      this._pidFile = path.join(process.cwd(), `${path.basename(config.cp.bin)}.pid`)
      var exit = function (err, code) {
        fs.removeSync(this._pidFile)
        if (err || code) throw (err || new Error(`${config.cp.bin} exited to boot ${code}`))
      }.bind(this)
      try {
        await fs.remove(this._pidFile)
        var srv = execa(config.cp.bin, config.cp.args || [], config.cp.opts || { cwd: __dirname, stdio: 'inherit' })
        await fs.writeFile(this._pidFile, srv.pid)
        console.log(`wrote PID file: ${this._pidFile}`)
        srv.on('error', code => exit(null, code))
        srv.on('exit', code => exit(null, code))
      } catch (err) {
        return exit(err)
      }
    },
    async teardown () {
      console.log(`removing pid file ${this._pidFile}`)
      var pid
      try {
        pid = parseInt(await fs.read(this._pidFile), 10)
      } catch (err) {
        // pass
      }
      if (pid || pid === 0) {
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
