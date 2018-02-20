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
  if (!process.env.DEBUG) await fs.remove(dest)
  else console.warn(`skipping cleanup. DEBUG set: ${process.env.DEBUG}`)
})

ava('reporter', async t => {
  await reporter({
    differences: [
      {
        name: 'grumpy.png',
        aFilename: path.join(__dirname, 'case-base', 'ref', 'grumpy.png'),
        bFilename: path.join(__dirname, 'case-base', 'run', 'grumpy.png')
      },
      {
        name: 'bub.png',
        aFilename: path.join(__dirname, 'case-base', 'ref', 'bub.png'),
        bFilename: path.join(__dirname, 'case-base', 'run', 'bub.png')
      }
    ],
    dest
  })
  var stat = await fs.lstat(path.join(dest, `a-grumpy.png`))
  t.truthy(stat, 'static site generated')
})
