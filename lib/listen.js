var net = require('net'),
    tls = require('tls'),
    crypto = require('crypto'),
    protocol = require('./protocol'),
    Link = require('./link');

function listen(port, host, options, callback) {
  var server,
      links = {};

  // @todo: allow for more fancy arguments

  function connection(socket) {
    var channel = protocol.wrap(socket);

    channel.once('dispatch', function(method, params) {
      var id, link;

      if (method === 'connect') {
        if (!protocol.compatible(params[0])) {
          channel.abort(protocol.ERR_INCOMPATIBLE);
          return;
        }

        do {
          try {
            id = crypto.randomBytes(20).toString('hex');
          } catch (err) {
            channel.abort(protocol.ERR_INTERNAL);
            return;
          }
        } while (id in links);

        function refuse() {
          links[id] = false;
        }

        channel.send('established', [id]);

        links[id] = link = new Link(options, refuse);
        link.use(channel);

        server.emit('link', link.handle);
      }

      else if (method === 'secure') {
        // @todo
      }

      else if (method === 'restore') {
        // @todo
      }

      else {
        channel.abort(protocol.ERR_NOT_ESTABLISHED);
      }
    });
  }

  if (options.key) {
    server = tls.createServer(options);
    server.on('secureConnection', connection);
  } else {
    server = net.createServer();
    server.on('connection', connection);
  }

  if (typeof callback === 'function') {
    server.on('link', callback);
  }

  server.listen(port, options.host || '127.0.0.1');

  return server;
}

module.exports = listen;
