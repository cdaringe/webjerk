# webjerky

connect to sauce labs, fire up a static server, & do some screenshot testing!

webjerky is a tiny script that wires together a few webjerk plugins.  it runs element-wise screenshot testing in real browsers on saucelabs.  you can read the single file source for a better idea!

specifically, it:

- generates snaps from [webjerk-snaps](../webjerky-snap),
- compares test snaps from reference snaps with [webjerk-image-set-diff](../webjerk-image-set-diff)
  - see ^^ docs to see how to use the comparison algorithm, approve new images, etc
- creates reports from [webjerk-image-set-diff-reporter](../webjerk-image-set-diff-reporter) when differences detected

<img width="300px" src="https://raw.githubusercontent.com/cdaringe/webjerk-image-set-diff-reporter/master/img/example.gif" />

## usage

[API documentation lives here](https://cdaringe.github.io/webjerky/index.html).

```js
var webjerky = require('webjerky')
var conf = { ... } // see API docs
webjerky(conf).then(...) // `snaps/` will be a dir with the result of `webjerk-snaps` within!
```
