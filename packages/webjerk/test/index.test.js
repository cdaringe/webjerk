'use strict'

require('perish')
var wj = require('../')
var ava = require('ava')
var path = require('path')

ava('happy path', async t => {
  await wj.run({})
  t.pass()
})

ava('plugins', async t => {
  var conf = {
    plugins: [path.resolve(__dirname, 'plugin', 'test-plugin.js')]
  }
  await wj.run(conf)
  t.truthy(wj._config.hooks.pre.registerDummyPlugin)
  t.truthy(wj._config.hooks.post.registerDummyPlugin)
})
