<p align="center">
  <img src='https://raw.githubusercontent.com/cdaringe/webjerk/master/img/webjerk_banner.png' alt='webjerk-logo' />
</p>

# webjerk

[![Greenkeeper badge](https://badges.greenkeeper.io/cdaringe/webjerk.svg)](https://greenkeeper.io/)

automation pipeline & plugins in _nodejs_.

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com) [![CircleCI](https://circleci.com/gh/cdaringe/webjerk.svg?style=svg)](https://circleci.com/gh/cdaringe/webjerk)

## description

webjerk is a simple stupid pipeline runner.  just what we needed.  YAPR (yet another pipeline runner).

webjerk has a 3 phase lifecycle: `pre`, `main`, `post`.

webjerk accepts plugins to register with it, and it runs those plugins.

## can it do anything cool?

no. but its plugins can!

see [snapjerk](https://github.com/cdaringe/webjerk/tree/master/packages/snapjerk).
