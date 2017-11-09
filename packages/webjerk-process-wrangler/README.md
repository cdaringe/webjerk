[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com) [ ![Codeship Status for cdaringe/webjerk](https://app.codeship.com/projects/c605af90-fd3d-0134-eab4-1aa2768960b8/status?branch=master)](https://app.codeship.com/projects/212005)

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
