'use strict'

require('perish')
var bb = require('bluebird')
var fs = require('fs')
var path = require('path')
var spawn = require('cross-spawn-promise')
bb.promisifyAll(fs)

var pkgRoot = path.resolve(__dirname, '..', 'packages')

fs.readdirAsync(pkgRoot)
.then(pkgs => bb.map(pkgs, pkg => {
  var p = spawn('npm', ['publish'], { cwd: path.join(pkgRoot, pkg) })
  .catch(err => console.error(`failed to publish ${pkg}. ${err.message}. ${err.stderr}`))
  return p
}, { concurrency: 4 }))
