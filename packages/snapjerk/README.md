<p align="center">
  <img src='https://raw.githubusercontent.com/cdaringe/webjerk/master/img/snapjerk_banner.png' alt='snapjerk-logo' />
</p>

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com) [ ![Codeship Status for cdaringe/webjerk](https://app.codeship.com/projects/c605af90-fd3d-0134-eab4-1aa2768960b8/status?branch=master)](https://app.codeship.com/projects/212005)

# snapjerk

web application screenshot testing in docker.

snapjerk is a small script that wires together a few webjerk plugins.  it runs element-wise screenshot testing in real browsers in a docker container.

specifically, it:

- generates [screenshots](https://github.com/cdaringe/webjerk/tree/master/packages/webjerk-snaps) of elements
- compares captured shots from a reference set shots with [webjerk-image-set-diff](https://github.com/cdaringe/webjerk/tree/master/packages/webjerk-image-set-diff)
  - if no reference images are found, the first generated set are designated as references
- creates a [visual, interactive report](https://github.com/cdaringe/webjerk/tree/master/packages/webjerk-image-set-diff-reporter) when differences detected

<img width="300px" src="https://raw.githubusercontent.com/cdaringe/webjerk/master/img/diff-report-demo.mov.gif" />

## usage

### cli

```bash
🛰 $ snapjerk --help

  web application screenshot testing in docker

  Usage
  // cli only execution
  $ snapjerk -s /path/to/static-site-directory -d '[{ elem: "body", name: "body" }]' # json or js array

  // using a snapjerk.config.js
  $ snapjerk

  // use a custom config file
  $ snapjerk -c /path/to/snapjerk/config.js

  Options
  -s, --static <directory>
  -c, --config <filename>
  -d, --definitions <snap-definitions>
```

### library

[API documentation lives here](https://cdaringe.github.io/snapjerk/index.html).

```js
var snapjerk = require('snapjerk')
var conf = { ... } // see API docs
snapjerk(conf).then(...) // `snaps/` will be a dir with the result of `webjerk-snaps` within!
```