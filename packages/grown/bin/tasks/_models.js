'use strict';

const path = require('path');

module.exports = (Grown, util) => {
  /* istanbul ignore else */
  if (!Grown.argv.flags.use || typeof Grown.argv.flags.use !== 'string') {
    throw new Error(`Missing models to --use, given '${Grown.argv.flags.use || ''}'`);
  }

  Grown.use(require('@grown/model'));

  const database = path.resolve(Grown.cwd, Grown.argv.flags.use);
  const factory = require(database);
  const Models = factory(Grown, util);

  return Models;
};