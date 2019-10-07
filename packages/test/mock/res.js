'use strict';

module.exports = Grown => {
  const MockRes = require('mock-res');

  function _mockResponse() {
    const res = new MockRes();

    res._header = null;
    res.cookies = {};
    res.clearCookie = k => { delete res.cookies[k]; };
    res.cookie = (k, v, o) => { res.cookies[k] = { value: v, opts: o || {} }; };

    const _setHeader = res.setHeader;

    res.setHeader = (k, v) => {
      res._header = true;

      if (k === 'set-cookie') {
        v.forEach(x => {
          const parts = x.split(';')[0].split('=');

          res.cookies[parts[0]] = parts[1];
        });
      }

      _setHeader.call(res, k, v);
    };

    Object.defineProperty(res, 'body', {
      get: () => res._getString(),
    });

    Object.defineProperty(res, 'json', {
      get: () => {
        try {
          return res._getJSON();
        } catch (e) {
          return null;
        }
      },
    });

    Object.defineProperty(res, 'ok', {
      value: (err, body = '', status = 200, message = '') => {
        if (typeof body === 'number') {
          status = body;
          message = '';
          body = '';
        }

        if (message && res.statusMessage !== message) throw new Error(`Unexpected message: ${message}`);
        if (res.statusCode !== status) throw new Error(`Unexpected status: ${status}`);
        if (res.body !== body) throw new Error(`Unexpected body: ${body}`);
        if (err !== null) throw new Error(`Unexpected error: ${err}`);
      },
    });

    return res;
  }

  return Grown('Test.Mock.Res', {
    // export helpers
    _mockResponse,

    $mixins() {
      const res = this._mockResponse();

      return {
        props: {
          res: () => res,
        },
      };
    },
  });
};
