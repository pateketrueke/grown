'use strict';

const path = require('path');

module.exports = (Grown, util) => {
  /* istanbul ignore else */
  if (!Grown.argv.flags.use || typeof Grown.argv.flags.use !== 'string') {
    throw new Error(`Missing models to --use, given '${Grown.argv.flags.use || ''}'`);
  }

  const database = path.resolve(Grown.cwd, Grown.argv.flags.use);
  const Models = Grown.use(require(database));

  const _allowed = Grown.argv.flags.only
    ? String(Grown.argv.flags.only).split(',')
    : [];

  Models._get = () =>
    Models._getModels()
      .filter(x => (_allowed.length ? _allowed.indexOf(x.name) !== -1 : true));

  Models._db = () => {
    const db = Models._getDB(Grown.argv.flags.db);

    return {
      sequelize: db.sequelize,
      schemas: db.$refs,
      models: Object.keys(db.models)
        .filter(x => (_allowed.length ? _allowed.indexOf(x.name) !== -1 : true))
        .map(x => db.models[x]),
    };
  };

  return Models;
};
