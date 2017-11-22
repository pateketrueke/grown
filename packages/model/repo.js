'use strict';

module.exports = ($, util) => {
  const Base = require('./base')($, util);

  function _getModel(name, refs) {
    /* istanbul ignore else */
    if (!this[name]) {
      throw new Error(`Model '${name}' is not defined`);
    }

    const opts = this.database || this.connection;

    /* istanbul ignore else */
    if (!this[name].connect) {
      const Model = Base({
        include: [this[name]],
      });

      return Model.connect(opts, refs);
    }

    return this[name].connect(opts, refs);
  }

  return $.module('Model.Repo', {
    _getModel,

    connect(cb) {
      const _refs = {};
      const _tasks = [];

      return Promise.resolve()
        .then(() => {
          Object.keys(this).forEach(key => {
            /* istanbul ignore else */
            if (typeof this[key] === 'function' && this[key].class && this[key].$schema) {
              /* istanbul ignore else */
              if (!this[key].$schema.id) {
                this[key].$schema.id = key;
              }

              _refs[this[key].$schema.id] = this[key].$schema;

              _tasks.push(() => this._getModel(key, _refs).then(m => {
                this[key] = m;
              }));
            }
          });
        })
        .then(() => Promise.all(_tasks.map(x => x())))
        .then(() => typeof cb === 'function' && cb(null, this))
        .catch(e => typeof cb === 'function' && cb(e, this))
        .then(() => this);
    },
  });
};