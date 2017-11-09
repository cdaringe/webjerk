<p align="center">
  <img src='https://raw.githubusercontent.com/cdaringe/webjerk/master/img/webjerk_banner.png' alt='webjerk-logo' />
</p>

# webjerk

automation pipeline & plugins in _nodejs_.

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com) [ ![Codeship Status for cdaringe/webjerk](https://app.codeship.com/projects/c605af90-fd3d-0134-eab4-1aa2768960b8/status?branch=master)](https://app.codeship.com/projects/212005)

## description

webjerk is a simple stupid, <200 LOC pipeline runner.  just what we needed.  YAPR (yet another pipeline runner).

webjerk has a 3 phase lifecycle: `pre`, `main`, `post`.

webjerk accepts plugins to register with it, and it runs those plugins.

## what can it do that's cool?

"this sounds lame. the README is waaay to small for this to be a usuable project. can it even do anything cool?"

no. but its plugins can!

see [snapjerk](packages/snapjerk).
