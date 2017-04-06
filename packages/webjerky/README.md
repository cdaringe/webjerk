# webjerky

connect to sauce, fire up a static server, do some screenshot testing!

webjerky is a tiny script that wires together a few webjerk plugins, & runs element-wise screenshot testing in saucelabs.  you can read the single file source for a better idea!

## usage

[API documentation lives here](https://cdaringe.github.io/webjerky/index.html).

```js
var webjerky = require('webjerky')
var conf = { ... } // see API docs
webjerky(conf).then(...) // `snaps/` will be a dir with the result of `webjerk-snaps` within!
```
