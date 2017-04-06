'use strict'

require('perish')
var wj = require('../')
var tape = require('tape')
var path = require('path')

tape('happy path', t => {
  t.plan(1)
  wj.run({})
  .then(t.pass)
})

tape('plugins', t => {
  t.plan(2)
  var conf = {
    plugins: [path.resolve(__dirname, 'plugin', 'test-plugin.js')]
  }
  wj.run(conf)
  .then(res => {
    t.ok(wj._config.hooks.pre.registerDummyPlugin)
    t.ok(wj._config.hooks.post.registerDummyPlugin)
    t.end()
  })
})
