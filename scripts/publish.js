'use strict'

require('perish')
var fs = require('fs-extra')
var path = require('path')
var execa = require('execa')
var bb = require('bluebird')
var pkgRoot = path.resolve(__dirname, '..', 'packages')

async function publish () {
  const pkgs = await fs.readdir(pkgRoot)
  await bb.map(
    pkgs,
    async pkg => {
      try {
        await execa('npm', ['publish'], { cwd: path.join(pkgRoot, pkg) })
      } catch (err) {
        // yes, swallow the error.  lerna publish is unreliable.
        console.error(`failed to publish ${pkg}. ${err.message}. ${err.stderr}`)
      }
    },
    { concurrency: 4 }
  )
}

publish()
