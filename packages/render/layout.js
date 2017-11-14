'use strict';

module.exports = ($, util) => {
  function _write(ctx, conn, template) {
    const _layout = template.locals.layout || this.template;

    if (template.locals.layout !== false && (_layout !== template.view)) {
      conn.res.write(ctx.render(_layout, {
        contents: template.contents,
      }));
    } else {
      conn.res.write(template.contents);
    }
  }

  return $.module('Render.Layout', {
    // export heleprs
    _write,

    // default options
    template: '',

    // setup extensions
    install() {
      const self = this;

      $.module('Render.Views', {
        _write(conn, template) {
          self._write(this, conn, template);
        },
      });
    },

    mixins(ctx) {
      if (ctx.class && !ctx.render) {
        return {
          _write: (conn, template) =>
            this._write(ctx, conn, template),
        };
      }
    },
  });
};