#!/usr/bin/env node

'use strict'

require('perish')
var snapjerk = require('./index')
var meow = require('meow')
var path = require('path')
var debug = require('debug')('webjerk:snapjerk:bin')

var conf = {}

const cli = meow(`
Usage
// simplest execution, snaps from website
$ snapjerk -u https://google.com -d '[{ selector: "body", name: "body" }]'

// simplest execution, snaps from static website dir
$ snapjerk -s /path/to/static-site-directory -d '[{ selector: "body", name: "body" }]'

// using snapjerk.config.js
$ snapjerk

// use a custom config file
$ snapjerk -c /path/to/snapjerk/config.js

Options
-u, --url <url>
-s, --static <directory>
-c, --config <filename>
-d, --definitions <snap-definitions>
`)

var configFilename = (cli.flags.c || cli.flags.config) ? path.resolve(cli.flags.c || cli.flags.config) : null
try {
  debug(`checking for config file: ${configFilename || './snapjerk.config.js'}`)
  conf = require(configFilename || path.resolve(process.cwd(), './snapjerk.config.js'))
  debug(`config file found:`, conf)
} catch (err) {
  debug(`config file not found`)
  if (configFilename) throw new Error(`config file ${configFilename} invalid`)
  // pass
}

var url = cli.flags.u || cli.flags.url
if (url) conf.url = url

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
debug('snapjerk final config:', conf)

async function run () {
  try {
    await snapjerk(conf)
  } catch (err) {
    if (err.code === 'EJERK') process.exit(1) // silence!
    throw err
  }
}
run()
