var Stream = require('stream'),
    rucksack = require('rucksack'),
    Parser = require('./lib/parser'),
    assemble = require('./lib/assemble');

function wrap(stream) {
  var functions = [],
      incoming = [],
      seal = [],
      parser;

  function send(method, a, b) {
    if (stream.writable) {
      assemble(stream, method, a, b);
    }
  }

  function pack(value) {
    return rucksack.pack(value, function(val, out) {
      var ref;

      if (val instanceof Function) {
        ref = functions.indexOf(val);

        if (ref === -1) {
          ref = seal.length;
          functions.push(val);
        }

        out.writeByte(0xba);
        out.writeVarint(ref);

        return false;
      } else if (val instanceof Stream) {
        ref = seal.indexOf(val);

        if (ref === -1) {
          ref = seal.length;

          function data(chunk) { send('data', ref, chunk); }
          function end() { send('end', ref); }

          val.on('data', data);
          val.on('end', end);

          function cleanup() {
            val.removeListener('data', data);
            val.removeListener('end', end);
          }

          seal.push(cleanup);
        }

        out.writeByte(0xbb);
        out.writeVarint(ref);

        return false;
      }
    });
  }

  function unpack(buffer) {
    return rucksack.unpack(buffer, function(byte, input) {
      var ref;

      if (byte === 0xba) {
        ref = input.readVarint();
        return function() {
          var args = Array.prototype.slice.call(arguments);
          send('call', ref, pack(args));
        };
      } else if (byte === 0xbb) {
        ref = input.readVarint();
        return incoming[ref] = new Stream();
      }
    });
  }

  parser = new Parser(stream);

  parser.on('message', function(buf) {
    stream.emit('message', unpack(buf));
  });

  parser.on('call', function(ref, buf) {
    var fn = functions[ref];
    fn.apply(fn, unpack(buf));
  });

  parser.on('data', function(ref, buf) {
    //console.log(':: ' + ref);
    incoming[ref].emit('data', buf);
  });

  parser.on('end', function(ref, buf) {
    incoming[ref].emit('end');
    incoming[ref] = null;
  });

  parser.on('seal', function(ref, buf) {
    seal[ref]();
    seal[ref] = null;
  });

  stream.send = function(value) {
    send('message', pack(value));
  };

  return stream;
}

module.exports = wrap;
