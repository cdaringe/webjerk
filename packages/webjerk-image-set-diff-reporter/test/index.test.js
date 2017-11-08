'use strict'

var ava = require('ava')
var reporter = require('../')
var path = require('path')
var fs = require('fs-extra')

var dest = path.join(__dirname, '__test_site')

ava.test.beforeEach(async function (params) {
  await fs.remove(dest)
})

ava.test.afterEach(async function (params) {
  await fs.remove(dest)
})

ava('reporter', async t => {
  var name = 'test-img.png'
  await reporter({
    differences: [
      {
        name,
        aFilename: path.join(__dirname, 'case-base', 'ref', name),
        bFilename: path.join(__dirname, 'case-base', 'run', name)
      }
    ],
    dest
  })
  var stat = await fs.lstat(path.join(dest, `a-${name}`))
  t.truthy(stat, 'static site generated')
  // fs.remove(dest)
})
