/**
 * @namespace configuration
 * @property {array|object} desiredCapabilities set of selenium desiredCapabilities.  we expect an array, although the similar named property is an object. be concious of this difference!
 * @property {string} testName test name.  used in image prefixing for image diffs
 * @property {string} url url for selenium to browse to
 * @property {function} [snapDefinitions] POJOs with `name` & `elem` keys.  these describe _what_ to snap & compare. See @{link https://github.com/webdriverio/webdrivercss#example}. If you don't know these in advanced, see `snapDefinitionsFromWindow`.
 * @property {function} [snapDefinitionsFromWindow] code to run in the browser to collect CSS selectors, if desired. Side effects, like modifying DOM, are permitted.  For instance, a side effect is, if you want images of all <div>s, adding unique `id`s to those nodes. **Must return a set of snapDefinitions**.
 * @property {object} [webdriverio] custom webdriverio configuration
 * @property {number} [concurrency] number of concurrent desiredCapabilities to launch at once
 * @example
 * var configTemplate = {
 *   desiredCapabilities: [
 *     { browserName: 'chrome' },
 *     { browserName: 'firefox' }
 *   ],
 *   snapDefinitions: [{ name: 'my-widget', elem: '#my_widget' }],
 *   snapDefinitionsFromWindow: function queryDivSnapDefinitions (divs, message) {
 *     // @NOTE this JS is run in the _browser_ context
 *     // webdriverio JS serialziation requires semis. :/
 *     var divs = document.getElementsByTagName('div');
 *     var map = [];
 *     var i = 0;
 *     var tDiv;
 *     while (divs[i]) {
 *       tDiv = divs[i];
 *       if (!tDiv.id) tDiv.id = '__dummy_div_' + i;
 *       map.push({ elem: '#' + tDiv.id, name: tDiv.id });
 *       ++i;
 *     }
 *     return map;
 *   },
 *   url: 'localhost:3333',
 *   webdriverio: {}
 * }
 */
