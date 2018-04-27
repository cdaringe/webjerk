var ava = require('ava').default
var WebjerkSnapsAdapter = require('../')
var fixture = require('./fixture')
var path = require('path')
var os = require('os')
var fs = require('fs-extra')

ava('getEntry', async t => {
  var root = os.tmpdir()
  var outputBasename = `${Math.random().toString().substr(2, 6)}-adapter-test-bundle.js`
  var outputFilename = path.resolve(root, outputBasename)
  await WebjerkSnapsAdapter.prototype.getEntry({
    entry: fixture.fakeEntryFilename,
    root,
    outputBasename
  })
  var fileExists = await fs.exists(outputFilename)
  t.truthy(fileExists, 'bundle file exists')
})
