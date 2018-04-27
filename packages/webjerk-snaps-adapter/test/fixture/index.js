var path = require('path')
var fakeEntryFilename = path.resolve(__dirname, 'fake-entry.js')

module.exports = {
  fakeEntry: require(fakeEntryFilename),
  fakeEntryFilename
}
