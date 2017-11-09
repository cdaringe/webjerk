'use strict'

require('perish')
const fs = require('fs-extra')
const path = require('path')
const swig = require('swig-templates')
const execa = require('execa')
const bb = require('bluebird')
const util = require('util')
const ghpages = require('gh-pages')
const docsPath = path.resolve(__dirname, 'docs')

const packagesPath = path.resolve(__dirname, '..', 'packages')
const marked = require('marked')

async function docs () {
  // get packages to doc'ify.
  const packages = (await fs.readdir(packagesPath))
  .map((p) => {
    const pkgRoot = path.resolve(packagesPath, p)
    return {
      name: p,
      path: pkgRoot,
      packageJSON: require(path.resolve(pkgRoot, 'package.json'))
    }
  })
  // .filter((n, i) => i === 0)

  // clean && create docs folder.
  await fs.remove(docsPath)
  await fs.remove(docsPath)

  // generate all docs.
  await bb.map(
    packages,
    async pkg => {
      const readmePath = path.join(pkg.path, 'README.md')
      const conf = path.join(__dirname, '.jsdoc.json')
      const dest = path.join(__dirname, `docs-${pkg.name}`)
      const cmd = { bin: 'jsdoc', args: [pkg.path, '-c', conf, '-R', readmePath, '-d', dest] }
      console.log(`Generating docs for ${pkg.name}`)
      try {
        await fs.remove(dest)
        await execa(cmd.bin, cmd.args)
      } catch (err) {
        console.error([
          `Failed to generate docs for ${pkg.name}.`,
          `Failing cmd ${cmd.bin} ${cmd.args.join(' ')} `
        ].join(' '))
        fs.remove(dest)
        return
      }
      await fs.move(dest, path.join(docsPath, pkg.name))
    }
  )

  // build documentation entry.
  const docsIndexTemplatePath = path.resolve(__dirname, 'docs-index.swig')
  const readmePath = path.resolve(__dirname, '../README.md')
  const readme = (await fs.readFile(readmePath)).toString()
  const docsIndexStr = swig.renderFile(
    docsIndexTemplatePath,
    { packages, readme: marked(readme) }
  )

  // output index file and associated assets
  await fs.writeFile(path.join(docsPath, 'index.html'), docsIndexStr)
  const gfmCSSPath = path.resolve(
    __dirname,
    '../node_modules/github-markdown-css/github-markdown.css'
  )
  await fs.copy(gfmCSSPath, path.join(docsPath, 'github-markdown.css'))

  // publish.
  try {
    await util.promisify(ghpages.publish).bind(ghpages)(docsPath)
  } finally {
    await fs.remove(docsPath)
  }
  console.log('docs successfully published')
}

docs()
