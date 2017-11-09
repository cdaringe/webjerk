[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com) [ ![Codeship Status for cdaringe/webjerk](https://app.codeship.com/projects/c605af90-fd3d-0134-eab4-1aa2768960b8/status?branch=master)](https://app.codeship.com/projects/212005)

# webjerk-image-set-diff

compares two sets of images.  provide it folders, `refDir` & `runDir`, where both folders contain `png` files.  images are compared by basename. that is, `/refDir/test-image.png` would be compared to `/runDir/test-image.png`.

the comparisons use [blink-diff](https://github.com/yahoo/blink-diff) to compare images.

## usage

```js
var ImageSetDiffer = require('webjerk-image-set-diff')
var refDir = '/reference-images'
var runDir = '/test-run-images'
var idr = new ImageSetDiffer({
  refDir,
  runDir,
  report: true, // generate a report?
  allowNewImages: true, // allow new images into the ref set
  approveChanges: false // appove run images as new refs. migrate run/ images to ref/
})
var diffs = await idr.run() // blinkDifference objects
```

when mismatches are detected, `ImageSetDiffer::run` throws.

- `err.code` will equal `'EIMAGEDIFFS'`
- `err.differences` will have an array of blink difference data attached to the failing image

```js
console.log(err.differences)
// => [{ basename, blinkDiff, message }, ..., for, each, image, mismatch]
```

## config

some settings may be set from the env:

- `WEBJERK_ALLOW_NEW_IMAGES`, set to allow new images not found in the reference set
- `WEBJERK_APPROVE_CHANGES`, set to approve all image changes
