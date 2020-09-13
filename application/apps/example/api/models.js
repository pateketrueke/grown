module.exports = Shopfish => {
  Shopfish.use(require('@grown/model/db'));
  Shopfish.use(require('@grown/model/cli'));

  return Shopfish('MyModels', {
    include: [
      Shopfish.Model.DB.bundle({
        models: `${__dirname}/schema/models`,
        database: {
          refs: require('~/etc/schema/generated').example,
          config: require('../db/config'),
          identifier: 'example',
        },
      }),
    ],
  });
};