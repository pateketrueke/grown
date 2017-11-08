'use strict';

const debug = require('debug')('grown:server');

const hostFactory = require('./host_');

module.exports = function $server(server, options, callback) {
  debug('Initializing server for %s', server.location.protocol);

  const protocolName = server.location.protocol.replace(':', '');
  const cb = hostFactory.bind(this, this._protocols[protocolName]);

  let _protocol;

  try {
    if (protocolName === 'https') {
      _protocol = this._protocols[protocolName].createServer(options, cb);
    } else {
      _protocol = this._protocols[protocolName].createServer(cb);
    }
  } catch (e) {
    throw new Error(`Protocol '${protocolName}' failed. ${e.message}`);
  }

  /* istanbul ignore else */
  if (!_protocol) {
    throw new Error(`Unsupported '${protocolName}' protocol`);
  }

  _protocol.listen(server.port, '0.0.0.0', function _onListen() {
    debug('Server was started and listening at port', server.port);

    callback.call(this);
  });

  return _protocol;
};