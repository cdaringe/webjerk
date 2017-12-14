'use strict'

var path = require('path').posix
var BlinkDiff = require('blink-diff')
var reporter = require('webjerk-image-set-diff-reporter')
var intersection = require('lodash/intersection')
var without = require('lodash/without')
var isNil = require('lodash/isNil')
var fs = require('fs-extra')
var bb = require('bluebird')
var debug = require('debug')('webjerk:image-set-diff')

/**
 * executes an image diff test workflow
 * @class ImageSetDiffer
 * @param {*} conf
 * @param {string} conf.refDir folder of reference images. relative or absolute
 * @param {string} conf.runDir folder of test run images. relative or absolute
 * @param {boolean} [conf.allowNewImages] allows new images to enter into the reference set. defaults to true
 * @param {boolean} [conf.approveChanges] updates ref images to match run images
 * @param {boolean} [conf.report] generate diff report into diff dir
 */
function ImageSetDiffer (conf) {
  if (!conf) throw new Error('missing config')
  if (!conf.refDir || !conf.runDir) throw new Error('refDir and runDir are required')
  if (!conf.diffDir) conf.diffDir = `${path.resolve(conf.runDir)}-diff`
  if (isNil(conf.allowNewImages)) conf.allowNewImages = process.env.WEBJERK_ALLOW_NEW_IMAGES === undefined ? false : !!process.env.WEBJERK_ALLOW_NEW_IMAGES
  if (isNil(conf.approveChanges)) conf.approveChanges = process.env.WEBJERK_APPROVE_CHANGES === undefined ? false : !!process.env.WEBJERK_APPROVE_CHANGES
  Object.assign(this, { conf })
}
ImageSetDiffer.factory = function (conf) { return new ImageSetDiffer(conf) }

Object.assign(ImageSetDiffer.prototype, {
  _refBasenames: [],
  _runBasenames: [],

  _createDiffConfig (basename) {
    return {
      imageAPath: path.resolve(this.conf.refDir, basename),
      imageBPath: path.resolve(this.conf.runDir, basename),
      thresholdType: BlinkDiff.THRESHOLD_PERCENT,
      threshold: 0.01,
      imageOutputPath: path.join(this.conf.diffDir, basename)
    }
  },
  /**
   * Compares all images between ref & run
   * @returns {Promise}
   */
  async compare () {
    await fs.mkdirp(this.conf.diffDir)
    var diffsAndErrors = await bb.map(
      this._imagePartitions.toCompare,
      async basename => {
        var diff = new BlinkDiff(this._createDiffConfig(basename))
        var blinkDiff = await bb.promisify(diff.run.bind(diff))()
        if (blinkDiff.differences) {
          var err = new Error(`${basename} changed beyond allowed allotted threshold`)
          Object.assign(err, { blinkDiff, basename })
          return err // NOTE, we are not throwing!  We want all results
        }
        return blinkDiff
      },
      { concurrency: 20 }
    )
    await this._handleCompareResults(diffsAndErrors)
  },
  async _copyRunImagesToRefImages () {
    debug('images using as ref:', this._runBasenames)
    await Promise.all(this._runBasenames.map(tBasname => {
      return fs.copy(path.join(this.conf.runDir, tBasname), path.join(this.conf.refDir, tBasname))
    }))
    this._refBasenames = this._runBasenames
  },
  _handleCompareResults (res) {
    var errors = res.filter(r => r instanceof Error)
    if (errors.length) {
      var err = new Error('image differences detected')
      err.code = 'EIMAGEDIFFS'
      err.differences = errors.map(({ basename, blinkDiff, message }) =>
        ({ basename, blinkDiff, message }))
      throw err
    }
    return res
  },

  /**
   * Handle new, run images with respect to the current ref, golden set
   * @param {Object} [opts]
   * @param {Boolean} [allowNewImages=false]
   * @returns {Promise}
   */
  async handleNewImages (opts) {
    opts = opts || {}
    var { newImages } = this._imagePartitions
    debug(`accepting new images: ${this.conf.allowNewImages}`)
    if (!newImages) throw new Error('missing image group')
    if (!newImages.length) return Promise.resolve()
    console.log(`${newImages.length} new images detected`)
    if (!opts.allowNewImages && !this.conf.allowNewImages) {
      var err = new Error([
        'new images detected:',
        newImages.map(img => `\t${img}\n`),
        'use `allowNewImages` or WEBJERK_ALLOW_NEW_IMAGES to enable'
      ].join('\n'))
      err.code = 'ENEWIMAGESFORBIDDEN'
      throw err
    }
    await Promise.all(newImages.map(tBasname => {
      var src = path.join(this.conf.runDir, tBasname)
      var dest = path.join(this.conf.refDir, tBasname)
      return fs.copy(src, dest)
    }))
    this._refBasenames = this._runBasenames
  },
  async maybeApproveChanges () {
    if (this.conf.approveChanges) {
      debug('images changes approved')
      return this._copyRunImagesToRefImages()
    }
  },
  _partitionImageBasenames () {
    var refBasenames = this._refBasenames
    var runBasenames = this._runBasenames
    var missingImages = without.apply(null, [refBasenames].concat(runBasenames))
    var toCompare = intersection(refBasenames, runBasenames)
    var newImages = without.apply(null, [runBasenames].concat(refBasenames))
    var imagePartitions = { existingImages: refBasenames, missingImages, toCompare, newImages }
    Object.assign(this, { _imagePartitions: imagePartitions })
    debug('imagePartitions', imagePartitions)
    return imagePartitions
  },
  async readTestState () {
    const [ref, run] = await Promise.all([
      this.conf.refDir,
      this.conf.runDir
    ].map(f => fs.readdir(f)))
    debug('test state - ref images found:', ref)
    debug('test state - run images found:', run)
    this._refBasenames = ref.filter(f => f.match(/\.png$/))
    this._runBasenames = run.filter(f => f.match(/\.png$/))
  },
  async report (differences) {
    if (!Array.isArray(differences)) throw new Error('missing array of differences')
    if (!this.conf.report) {
      debug(`reporting disabled, skipping report for ${differences.length} differences`)
      return
    }
    var enriched = differences.map(diff => Object.assign({}, diff, {
      name: diff.basename,
      aFilename: path.join(this.conf.refDir, diff.basename),
      bFilename: path.join(this.conf.runDir, diff.basename)
    }))
    return reporter({ differences: enriched, dest: path.join(this.conf.diffDir, 'report') })
  },
  async run () {
    let toThrow = []
    debug('running image diff algorithm')
    await this.readTestState()
    const partitions = await this._partitionImageBasenames()
    try {
      await this.validateImagePartitions(partitions)
    } catch (err) {
      if (err.code === 'EMISSINGIMAGES') toThrow.push(err)
      else throw err
    }
    const didUpsertNewImages = await this.upsertReferenceImages()
    try {
      await this.handleNewImages({ allowNewImages: didUpsertNewImages })
    } catch (err) {
      if (err.code === 'ENEWIMAGESFORBIDDEN') toThrow.push(err)
      else throw err
    }
    await this.maybeApproveChanges()
    try {
      await this.compare()
    } catch (err) {
      if (err.code === 'EIMAGEDIFFS') {
        debug('EIMAGEDIFFS', err.differences)
        await this.report(err.differences)
      }
      toThrow.push(err)
    }
    if (toThrow.length) {
      let err = new Error('image set changes detected')
      err.code = 'ECHANGES'
      err.errors = toThrow
      throw err
    }
  },
  /**
   * @returns didUpsertNewImages
   */
  async upsertReferenceImages () {
    var { existingImages, newImages } = this._imagePartitions
    if (existingImages.length) {
      debug('ref images detected. skipping upsert of run images')
      return false
    }
    if (!newImages) throw new Error('missing image group')
    debug('no reference images found. setting reference images from run.')
    await this._copyRunImagesToRefImages()
    return true
  },
  validateImagePartitions ({ missingImages, toCompare, newImages }) {
    if (!missingImages || !toCompare || !newImages) throw new Error('missing image group')
    if (missingImages.length) {
      var err = new Error([
        `missing images:\n\t${missingImages.join('\n\t')}`,
        'if these images are no longer required, please remove them from the reference set.'
      ].join('\n'))
      err.code = 'EMISSINGIMAGES'
      throw err
    }
  }
})

module.exports = ImageSetDiffer
