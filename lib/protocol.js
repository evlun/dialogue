var Parser = require('./parser'),
    assemble = require('./assemble');

function wrap(socket) {
  var parser = new Parser(socket);

  socket.open = true;
  socket.clogged = false;
  socket.on('drain', function() {
    socket.clogged = false;
  });

  socket.send = function(method, params) {
    socket.clogged = assemble(socket, method, params) === false;
  };

  parser.on('dispatch', function(method, params) {
    socket.emit('dispatch', method, params);
  });

  socket.abort = function(code) {
    throw new Error();
    if (socket.open) {
      socket.open = false;
      socket.send('abort', [code]);
      socket.end();
    }
  };

  return socket;
}

function compatible(version) {
  return version === exports.version;
}

exports.version = 1;
exports.wrap = wrap;
exports.compatible = compatible;

exports.ERR_INTERNAL = 1;
exports.ERR_INCOMPATIBLE = 2;
exports.ERR_UNKNOWN_ID = 3;
exports.ERR_NOT_ESTABLISHED = 4;
exports.SWITCH_CHANNEL = 5;
