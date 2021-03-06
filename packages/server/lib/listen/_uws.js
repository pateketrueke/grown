'use strict';

const debug = require('debug')('grown:uws');

const { STATUS_CODES, IncomingMessage } = require('http');
const { Transform, Readable } = require('stream');

const uWS = require(process.env.U_WEBSOCKETS_PATH || 'uWebsockets.js');
const qs = require('querystring');

const _util = require('util');
const {
  send, sendFile, sendJSON, setStatus,
} = require('./util');

const $host = require('./host');

// https://github.com/uNetworking/uWebSockets.js/issues/58
function remoteAddressToString(address) {
  if (address.byteLength === 4) {
    return new Uint8Array(address).join('.');
  }

  if (address.byteLength === 16) {
    const arr = Array.from(new Uint16Array(address));

    if (!arr[0] && !arr[1] && !arr[2] && !arr[3] && !arr[4] && arr[5] === 0xffff) {
      return new Uint8Array(address.slice(12)).join('.');
    }

    return Array.from(new Uint16Array(address)).map(v => v.toString(16)).join(':').replace(/((^|:)(0(:|$))+)/, '::');
  }
}

function convertFrom(obj) {
  const values = Object.create(null);

  obj.forEach(chunk => {
    const value = values[chunk.name];

    if (value && !Array.isArray(value)) {
      values[chunk.name] = [value];
    }

    let result = chunk.data;
    if (result instanceof ArrayBuffer) {
      result = Buffer.from(result).toString('utf8');
    }

    if (!values[chunk.name]) {
      values[chunk.name] = result;
    } else {
      values[chunk.name].push(result);
    }
  });
  return values;
}

function setStream(req, cb) {
  const stream = new Readable();

  stream._read = () => true;
  stream._abort = () => {
    stream.destroy();
    cb();
  };

  req.pipe = stream.pipe.bind(stream);
  req.on = stream.on.bind(stream);
  req.stream = stream;
}

function prepBody(req, res, cb) {
  res.onData((part, end) => {
    const slice = part.slice(part.byteOffset, part.byteLength);

    req.stream.push(new Uint8Array(slice));

    if (end) {
      req.stream.push(null);
      cb();
    }
  });
}

function readBody(req, res, cb) {
  let buffer = Buffer.from('');
  res.onData((part, end) => {
    const chunk = Buffer.from(part);

    if (req.stream) {
      const slice = part.slice(part.byteOffset, part.byteLength);

      req.stream.push(new Uint8Array(slice));
    }

    buffer = Buffer.concat([buffer, chunk]);
    if (end) {
      if (req.stream) req.stream.push(null);
      cb(buffer);
    }
  });
}

function ServerRequest(req, res) {
  Transform.call(this);

  // this would patch added methods to native req, e.g. passport
  const keys = ['login', 'logIn', 'logout', 'logOut', 'isAuthenticated', 'isUnauthenticated'];

  keys.forEach(key => {
    this[key] = IncomingMessage.prototype[key];
  });

  this._writableState.objectMode = true;
  this._readableState.objectMode = false;

  this.body = {};
  this.url = req.getUrl() || '/';
  this.query = qs.parse(req.getQuery());
  this.method = req.getMethod().toUpperCase();
  this.headers = _util._extend({}, req.headers);
  this.rawHeaders = [];
  this.connection = {
    remoteAddress: remoteAddressToString(res.getRemoteAddress()),
  };

  Object.keys(req.headers).forEach(key => {
    this.rawHeaders.push(key);
    this.rawHeaders.push(req.headers[key]);
  });
}

_util.inherits(ServerRequest, Transform);

function ServerResponse(req, resp) {
  Transform.call(this);

  this._buffer = [];
  this._headers = {};
  this._pending = false;
  this._response = resp;

  this.aborted = false;
  this.finished = false;
  this.statusCode = 501;
  this.statusMessage = STATUS_CODES[this.statusCode];

  resp.onAborted(() => {
    if (req.stream) {
      req.stream._abort();
    }

    this.aborted = true;
    this.finished = true;
  });

  this.on('finish', () => {
    const body = Buffer.concat(this._buffer);
    const head = {};

    Object.keys(this._headers).forEach(key => {
      head[key.toLowerCase()] = this._headers[key];
    });

    resp.cork(() => {
      resp.writeStatus(`${this.statusCode} ${STATUS_CODES[this.statusCode]}`);
      this.writeHead(this.statusCode, head);
      this.finished = true;

      resp.write(body);
      resp.end();
    });
  });
}

_util.inherits(ServerResponse, Transform);

ServerResponse.prototype.send = send;
ServerResponse.prototype.json = sendJSON;
ServerResponse.prototype.status = setStatus;
ServerResponse.prototype.sendFile = sendFile;

ServerResponse.prototype._transform = function _transform(chunk, encoding, next) {
  this._buffer.push(chunk);
  next();
};

ServerResponse.prototype.writeHead = function writeHead(statusCode, reason, headers) {
  /* istanbul ignore else */
  if (this.finished) {
    throw new Error('Response is already sent');
  }

  /* istanbul ignore else */
  if (reason && typeof reason === 'object') {
    headers = reason;
    reason = undefined;
  }

  this.statusCode = statusCode;
  this.statusMessage = reason || STATUS_CODES[statusCode] || 'unknown';

  /* istanbul ignore else */
  Object.assign(this._headers, headers);
  Object.keys(this._headers).forEach(key => {
    if (Array.isArray(this._headers[key])) {
      this._headers[key].forEach(header => {
        this._response.writeHeader(key, String(header));
      });
    } else if (key !== 'content-length') {
      this._response.writeHeader(key, String(this._headers[key]));
    }
    delete this._headers[key];
  });
};

ServerResponse.prototype.setHeader = function setHeader(name, value) {
  this._headers[name.toLowerCase()] = value;
};

ServerResponse.prototype.getHeader = function getHeader(name) {
  return this._headers[name.toLowerCase()];
};

ServerResponse.prototype.removeHeader = function removeHeader(name) {
  delete this._headers[name.toLowerCase()];
};

module.exports = function _uws(ctx, options, callback, protocolName) {
  let app;
  if (protocolName === 'https') {
    app = uWS.SSLApp(options.https);
  } else {
    app = uWS.App();
  }

  this.close = () => uWS.us_listen_socket_close(app._self);
  app.listen(ctx.host, ctx.port, socket => {
    debug('#%s Server was started and listening at port', process.pid, ctx.port);

    app._self = socket;
    app.ws('/*', {
      maxPayloadLength: 16 * 1024 * 1024,
      compression: 0,
      idleTimeout: 10,
      open: ws => {
        Object.assign(ws, this._.buildPubsub(), {
          address: remoteAddressToString(ws.getRemoteAddress()),
        });
        this._clients.push(ws);
        this._events.emit('open', ws);
      },
      close: ws => {
        this._events.emit('close', ws);
        this._clients.splice(this._clients.indexOf(ws), 1);
      },
      message: (ws, payload) => {
        ws.emit('message', String.fromCharCode.apply(null, new Uint8Array(payload)));
      },
    });
    app.any('/*', (res, req) => {
      req.headers = { host: ctx.host };
      req.forEach((k, v) => {
        req.headers[k] = v;
      });

      const _req = new ServerRequest(req, res);
      const _resp = new ServerResponse(_req, res);

      const next = (data, cb) => {
        if (data instanceof Buffer) data = data.toString('utf8');
        if (typeof data === 'string' && data.length) {
          _req.body = cb(data);
          _req._body = true;
        }

        $host.call(this, ctx.location, _req, _resp);
      };

      const type = req.getHeader('content-type');

      setStream(_req, next);
      if (this._uploads) {
        prepBody(_req, res, next);
      } else if (type.includes('/json')) {
        readBody(_req, res, data => next(data, JSON.parse));
      } else if (type.includes('/x-www-form-urlencoded')) {
        readBody(_req, res, data => next(data, qs.parse));
      } else if (type.includes('/form-data')) {
        readBody(_req, res, data => {
          _req.body = convertFrom(uWS.getParts(data, type));
          _req._body = true;
          next();
        });
      } else {
        prepBody(_req, res, next);
      }
    });

    callback.call(this);
  });

  return app;
};
