var net = require('net'),
    tls = require('tls'),
    Link = require('./link'),
    protocol = require('./protocol');

function connect(port, host, options) {
  var link, socket,
      retry = true;

  if (arguments.length === 2) {
    if (typeof host === 'string') {
      options = {};
    } else {
      options = host;
      host = '127.0.0.1';
    }
  } else if (arguments.length === 1) {
    host = '127.0.0.1';
    options = {};
  }

  function listener() {
    var channel = protocol.wrap(socket);

    if (options.secret) {
      // ...
    } else {
      channel.send('connect', [protocol.version]);
      channel.once('dispatch', function(method, params) {
        if (method === 'established') {
          link.use(channel);
        } else if (method === 'abort') {
          if (params[0] === protocol.ERR_INCOMPATIBLE) {
            // @todo: produce an error
            shutdown();
          }
        } else {
          channel.abort(protocol.ERR_NOT_ESTABLISHED);
        }
      });
    }
  }

  function establish() {
    if (options.key) {
      socket = tls.connect(port, host, options);
      socket.once('secureConnect', listener);
    } else {
      socket = net.connect(port, host);
      socket.once('connect', listener);
    }

    socket.on('error', function() { });
    socket.once('close', function() {
      if (retry) {
        setTimeout(establish, 3000);
      }
    });
  }

  function shutdown() {
    retry = false;
  }

  link = new Link(options, shutdown);

  establish();

  return link.handle;
}

module.exports = connect;
