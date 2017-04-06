'use strict'

require('perish')
var wjs = require('../')
var tape = require('tape')
var isFn = require('lodash/isFunction')

tape('happy path', t => {
  t.plan(2)
  var plugin = wjs({})
  t.ok(isFn(plugin.pre))
  t.ok(isFn(plugin.post))
})
