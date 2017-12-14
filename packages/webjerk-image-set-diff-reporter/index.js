'use strict'

var path = require('path').posix
var fs = require('fs-extra')
var execa = require('execa')
var debug = require('debug')('webjerk:image-set-diff-reporter')

module.exports = async function webjerkImageSetDiffReporter ({ differences, dest }) {
  if (!dest) throw new Error('missing dest')
  debug(`building report`)
  var diffBasename = `differences-${Date.now()}.json`
  var serializedDiffs = JSON.stringify(differences, null, 2)
  var buildDir = path.join(__dirname, 'build')
  await Promise.all([
    fs.remove(buildDir),
    fs.remove(dest)
  ])
  var env = Object.assign({ REACT_APP_DIFFS: diffBasename, NODE_ENV: 'production' })
  debug('running react-scripts build')
  await execa('npm', ['run', 'build'], { cwd: __dirname, env, stdio: 'inherit' })
  await fs.move(path.join(__dirname, 'build'), dest)
  debug('copying static assets to buid destination')
  await fs.writeFile(path.join(dest, diffBasename), serializedDiffs)
  await Promise.all(differences.map(diff => {
    return Promise.all([
      fs.copy(diff.aFilename, path.join(dest, `a-${diff.name}`)),
      fs.copy(diff.bFilename, path.join(dest, `b-${diff.name}`))
    ])
  }))
  debug(`report written to: ${dest}`)
}
