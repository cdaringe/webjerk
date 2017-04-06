'use strict'

var wj = require('webjerk')
var pwrangle = require('webjerk-process-wrangler')
var path = require('path')
var tape = require('tape')

tape('drives the browser, takes screenshots, outputs report on fail', t => {
  t.plan(1)
  return wj.run({
    plugins: [
      {
        name: 'httpster',
        register: pwrangle,
        config: {
          cp: {
            bin: path.resolve(__dirname, '..', 'node_modules', '.bin', 'httpster'),
            args: ['-d', __dirname]
          }
        }
      },
      {
        name: 'selenium',
        register: pwrangle,
        config: {
          cp: {
            bin: 'selenium-standalone',
            args: ['start']
          }
        }
      },
      {
        register: require('../'),
        config: {
          desiredCapabilities: [ // see webdriverio or selenium docs!
            { browserName: 'firefox' },
            { browserName: 'chrome' }
          ],
          concurrency: 2,
          url: 'http://localhost:3333', // what page to extract snaps from
          testName: 'screenshot-all-divs',
          snapDefinitionsFromWindow: function queryDivSnapDefinitions (divs, message) {
            // @NOTE this JS is run in the _browser_ context
            // webdriverio JS serialziation requires semis. :/
            var divs = document.getElementsByTagName('div');
            var map = [];
            var i = 0;
            var tDiv;
            while (divs[i]) {
              tDiv = divs[i];
              if (!tDiv.id) tDiv.id = '__dummy_div_' + i;
              map.push({ elem: '#' + tDiv.id, name: tDiv.id });
              ++i;
            }
            return map;
          }
        }
      }
    ]
  })
  .then(() => {
    t.pass()
  })
  .then(t.end, t.end)
})
