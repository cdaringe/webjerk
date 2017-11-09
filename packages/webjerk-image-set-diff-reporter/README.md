[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com) [ ![Codeship Status for cdaringe/webjerk](https://app.codeship.com/projects/c605af90-fd3d-0134-eab4-1aa2768960b8/status?branch=master)](https://app.codeship.com/projects/212005)

# webjerk-image-set-diff-reporter

generates a static website displaying sets of image differences.

<img width="300px" src="https://raw.githubusercontent.com/cdaringe/webjerk/master/img/diff-report-demo.mov.gif" />

plays nice with `webjerk-image-set-diff`, but has no tight coupling or interest directly in it!

```js
// see test/index.js for more!
var reporter = require('webjerk-image-set-diff-reporter')
reporter({
  differences: [
    {
      name: 'banana-web-widget',
      aFilename: '/reference/banana.png',
      bFilename: '/test-run/banana.png'
    }
  ],
  dest: '/static-site' // some absolute path!
}).then(...)
```
