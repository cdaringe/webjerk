'use strict'

var wjs = require('../')
var tape = require('tape')
var isFn = require('lodash/isFunction')

tape('happy path', t => {
  t.plan(2)
  var conf = {}
  wjs(conf, err => {
    if (err) return t.fail(err)
    t.ok(isFn(conf.plugins.pre.saucie))
    t.ok(isFn(conf.plugins.post.saucie))
  })
})
