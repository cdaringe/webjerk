#!/usr/bin/env node

'use strict'

var snapjerk = require('./index')
var meow = require('meow')
var path = require('path')

var conf = {}

const cli = meow(`
Usage
// simplest execution
$ snapjerk -s /path/to/static-site-directory -d '[{ elem: "body", name: "body" }]'

// using snapjerk.config.js
$ snapjerk

// use a custom config file
$ snapjerk -c /path/to/snapjerk/config.js

Options
-s, --static <directory>
-c, --config <filename>
-d, --definitions <snap-definitions>
`)

var configFilename = (cli.flags.c || cli.flags.config) ? path.resolve(cli.flags.c || cli.flags.config) : null
try {
  conf = require(configFilename || './snapjerk.config.js')
} catch (err) {
  if (configFilename) throw new Error(`config file ${configFilename} invalid`)
  // pass
}

var staticDirectory = (cli.flags.s || cli.flags.static) ? path.resolve(cli.flags.s || cli.flags.static) : null
if (staticDirectory) conf.staticDirectory = staticDirectory

var snapDefinitions = cli.flags.d || cli.flags.definitions
if (snapDefinitions) {
  try {
    snapDefinitions = JSON.parse(snapDefinitions)
  } catch (err) {
    try {
      snapDefinitions = eval(snapDefinitions) // eslint-disable-line
    } catch (err) {
      throw new Error('snap definitions are invalid JSON')
    }
  }
  conf.snapDefinitions = snapDefinitions
}

snapjerk(conf)
