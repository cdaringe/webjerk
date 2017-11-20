'use strict'

const ava = require('ava').default
const path = require('path')
const fs = require('fs-extra')
const os = require('os')
const snapjerk = require('../src/index')
const execa = require('execa')
const bin = path.resolve(__dirname, '../src/bin.js')

var goldenSite = path.resolve(__dirname, 'fixture', 'golden-site')
var goldenSnaps = [
  { selector: '#diff-0', name: 'grumpy' },
  {
    selector: '#diff-1',
    name: 'bub',
    onPreSnap: function (snapDefinition, browserName, browserDriver, conf) {
      // warning: this code is run in a docker container!
      var onPreSnapTestFile = path.resolve(
        process.env.RELATIVE_SNAPS_RUN_DIR,
        `onPreSnap-${snapDefinition.name}.txt`
      )
      debug(`writing: ${onPreSnapTestFile}`) // eslint-disable-line
      return fs.writeFile( // this fs is _actually_ that which exists in the adapter
        onPreSnapTestFile,
        'testing-onPreSnap'
      )
    }
  }
]
async function createTmpProject () {
  var tempDir = path.join(os.tmpdir(), `snapjerk-test-${Math.random().toString().substr(2, 10)}`)
  await fs.copy(goldenSite, tempDir)
  return tempDir
}
ava.beforeEach(async t => {
  t.context.siteDir = await createTmpProject()
})
ava.afterEach(async t => {
  await fs.remove(t.context.siteDir)
})

ava.serial('generates reference set', async function (t) {
  var snapRunRoot = path.join(t.context.siteDir, 'snaps/run')
  var snapRefRoot = path.join(t.context.siteDir, 'snaps/ref')
  await snapjerk({
    staticDirectory: t.context.siteDir,
    snapDefinitions: goldenSnaps,
    snapRunRoot,
    snapRefRoot
  })
  var snapsDir = await fs.lstat(path.join(t.context.siteDir, 'snaps'))
  t.truthy(snapsDir.isDirectory())
  var refs = await fs.readdir(snapRefRoot)
  t.is(refs.length, 2, 'two images found')
  t.truthy(refs.some(ref => ref.match(/bub/), 'image of bub found'))
  t.truthy(refs.some(ref => ref.match(/grumpy/), 'image of grumpy found'))
  var preSnapFileWritten = await fs.exists(path.join(snapRunRoot, 'onPreSnap-bub.txt'))
  t.truthy(preSnapFileWritten, 'onPreSnap file written')
})

ava.serial('generates reference set (cli)', async function (t) {
  var snapRefRoot = path.join(t.context.siteDir, 'snaps/ref')
  await execa(
    bin,
    [
      '-s', t.context.siteDir,
      '-d', JSON.stringify(goldenSnaps)
    ],
    { cwd: t.context.siteDir, stdio: 'inherit' }
  )
  var snapsDir = await fs.lstat(path.join(t.context.siteDir, 'snaps'))
  t.truthy(snapsDir.isDirectory())
  var refs = await fs.readdir(snapRefRoot)
  t.is(refs.length, 2, 'two images found')
  t.truthy(refs.some(ref => ref.match(/bub/), 'image of bub found'))
  t.truthy(refs.some(ref => ref.match(/grumpy/), 'image of grumpy found'))
})
