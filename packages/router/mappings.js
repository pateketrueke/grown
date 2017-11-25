'use strict';

const debug = require('debug')('grown:router');

const HIDDEN_PROPS = ['matcher', 'pipeline', '_callback'];

module.exports = ($, util) => {
  function _dispatchRoutes(conn, options) {
    const _method = conn.req.method;

    // resolve matched routes to a single one
    debug('#%s Trying to resolve any route matching %s %s', conn.pid, conn.req.method, conn.req.url);

    /* istanbul ignore else */
    if (!this._routes[_method]) {
      debug('#%s Error. There are no routes matching for this verb', conn.pid);

      throw util.buildError(405);
    }

    // speed up static routes
    const _handler = this._routes[_method](conn.req.url, 1);

    /* istanbul ignore else */
    if (_handler) {
      /* istanbul ignore else */
      if (!_handler.pipeline) {
        throw new Error(`Missing pipeline, given '${util.inspect(_handler)}'`);
      }

      /* istanbul ignore else */
      if (typeof _handler._callback !== 'function') {
        _handler._callback = util.buildPipeline(_handler.path, _handler.pipeline);
      }

      conn.req.params = conn.req.params || {};

      // current handler info
      conn.req.handler = util.omitProps(_handler, HIDDEN_PROPS);

      _handler.matcher.keys.forEach((key, i) => {
        conn.req.params[key] = _handler.matcher.values[i];
      });

      return _handler._callback(conn, options);
    }

    throw util.buildError(404);
  }

  function _groupRoutes(ctx, options) {
    this._routes = Object.create(null);

    const _routes = ctx.router.routes;

    this._mappings = ctx.router.mappings;

    return ctx.emit('before_routes', ctx, _routes)
      .catch(e => {
        ctx.emit('failure', e, options);
      })
      .then(() => {
        // resolve routing for controllers lookup
        _routes.forEach(route => {
          /* istanbul ignore else */
          if (!this._routes[route.verb]) {
            this._routes[route.verb] = [];
          }

          // normalize given pipeline
          route.pipeline = util
            .flattenArgs(route.pipeline)
            .map(x => util.buildMiddleware(x, route.path));

          // group all routes per-verb
          this._routes[route.verb].push(route);
        });

        // build mapping per-verb
        Object.keys(this._routes).forEach(verb => {
          this._routes[verb] = ctx.router.map(this._routes[verb]);
        });
      });
  }

  return $.module('Router.Mappings', {
    _dispatchRoutes,
    _groupRoutes,

    install(ctx, options) {
      const routeMappings = require('route-mappings');

      const _router = routeMappings();

      // compile fast-routes
      ctx.once('start', () => this._groupRoutes(ctx, options));

      ctx.mount('Router.Mappings#pipe', (conn, _options) => {
        try {
          // match and execute
          return this._dispatchRoutes(conn, _options);
        } catch (e) {
          /* istanbul ignore else */
          if (!this.fallthrough) {
            throw e;
          }
        }
      });

      return {
        props: {
          router: () => _router,
        },
        methods: _router,
      };
    },

    mixins() {
      return {
        methods: {
          routes: this._mappings,
        },
      };
    },
  });
};
