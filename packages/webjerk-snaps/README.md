[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com) [![CircleCI](https://circleci.com/gh/cdaringe/webjerk.svg?style=svg)](https://circleci.com/gh/cdaringe/webjerk)

# webjerk-snaps

website visual regression testing.

this package:

- takes user input for a [snapjerk](https://github.com/cdaringe/webjerk/tree/master/packages/snapjerk) execution, and injects sensible defaults
- launches some-sort-browser adapter to capture screenshots
  - the *_only current supported adapter_* is [webjerk-snaps-adapter-puppeteer](https://github.com/cdaringe/webjerk/tree/master/packages/webjerk-snaps-adapter-puppeteer).
  - the [saucelabs adapter](https://github.com/cdaringe/webjerk/tree/master/packages/webjerk-saucie) needs rework!
- creates a new reference image set _or_ compares the captured images to a reference set
  - on comparison failure (optionally) [generates a static website highlighting the failed comparisons](https://github.com/cdaringe/webjerk-image-set-diff-reporter).  this is handy if you want your CI to deploy the site somewhere for public viewing.

this type of testing is somtimes also called CSS testing or screenshot testing.

don't like the way this package works?  hack it!  all things `webjerk` are small and modular.  feel free to drop us an issue on GitHub with questions & comments too!

## usage

[API documentation lives here](https://cdaringe.github.io/webjerk/webjerk-snaps/index.html).

- to get image baselines, create a config and run. see the `#example` section
- run it!
  - all image **basenames** that are _not_ present in the reference set become part of the reference set.
- subsequent runs compare against these images

## example

```js
// test.js
'use strict'

var wj = require('webjerk')

wj.run({
  plugins: [
    {
      name: 'webjerk-snaps',
      config: {
        desiredCapabilities: [ // see webdriverio or selenium docs!
          { browserName: 'chrome' },
          { browserName: 'firefox' }
        ],
        url: 'http://localhost:3333', // what page to extract snaps from
        testName: 'screenshot-all-divs',
        snapDefinitions: [{ selector: 'div', name: 'best div' }], // OR,
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
            map.push({ selector: '#' + tDiv.id, name: tDiv.id });
            ++i;
          }
          return map;
        }
      }
    }
  ]
})
```
