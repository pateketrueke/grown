'use strict';

const util = require('util');

const $new = require('object-new');

const objectUtil = require('./object');
const contextUtil = require('./context');
const processUtil = require('./process');
const extraHelpers = require('./helpers');

// merge all helpers
util._extend(module.exports, objectUtil);
util._extend(module.exports, contextUtil);
util._extend(module.exports, processUtil);
util._extend(module.exports, extraHelpers);

// merge definition helpers
Object.keys($new).forEach(key => {
  module.exports[key] = $new[key];
});

// common utils
module.exports.inspect = util.inspect;
