[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com) [![CircleCI](https://circleci.com/gh/cdaringe/webjerk.svg?style=svg)](https://circleci.com/gh/cdaringe/webjerk)

# webjerk-process-wrangler

add webjerk hooks to launch &amp; teardown a process.  it also writes a temporary PID file to disk.  if the previous run failed and the PID file remains, webjerk attempts to remove that PID.

## config

```js
{
  bin: 'node',
  args: [...], // ['./test.js']
  opts: {} // see child_proccess.spawn opts
}
```
