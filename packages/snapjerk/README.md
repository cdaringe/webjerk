# snapjerk

web application screenshot testing in docker.


snapjerk is a small script that wires together a few webjerk plugins.  it runs element-wise screenshot testing in real browsers in a docker container.  you can read the single file source for a better idea!

specifically, it:

- generates snaps from [webjerk-snaps](../snapjerk-snap),
  - by default, 'jerky looks for sauce creds, but you can test against a local selenium instance by passing `conf.localSelenium` or `snapjerk_LOCAL=true`
- compares test snaps from reference snaps with [webjerk-image-set-diff](../webjerk-image-set-diff)
  - see ^^ docs to see how to use the comparison algorithm, approve new images, etc
- creates reports from [webjerk-image-set-diff-reporter](../webjerk-image-set-diff-reporter) when differences detected

<img width="300px" src="https://raw.githubusercontent.com/cdaringe/webjerk-image-set-diff-reporter/master/img/example.gif" />

## usage

[API documentation lives here](https://cdaringe.github.io/snapjerk/index.html).

```js
var snapjerk = require('snapjerk')
var conf = { ... } // see API docs
snapjerk(conf).then(...) // `snaps/` will be a dir with the result of `webjerk-snaps` within!
```
