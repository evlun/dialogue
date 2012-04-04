var Parser = require('./parser'),
    EventEmitter = require('events').EventEmitter;

function Channel(stream) {
  var _this = this;
  this.stream = stream;

  this.parser = new Parser(function() {
    _this.emit.apply(_this, Array.prototype.slice.call(arguments));
  });

  stream.on('data', function(chunk) {
    _this.parser.feed(chunk);
  });

  EventEmitter.call(this);
}

require('util').inherits(Channel, EventEmitter);

Channel.prototype.write = function(data) {
  if (!(data instanceof Buffer)) data = new Buffer(data);
  this.stream.write(data);
};

Channel.prototype.send = function(method, a, b) {
  var l, o,
      c = -1;

  switch (method) {
    case 'link':  this.write([0]); break;
    case 'auth':  this.write([1]); break;
    case 'allow': this.write([2]); break;
    case 'end':   this.write([3]); break;

    case 'accept':    this.write([4]); this.write(new Buffer(a, 'hex')); break;
    case 'restore':   this.write([5]); this.write(new Buffer(a, 'hex')); break;
    case 'challenge': this.write([6]); this.write(new Buffer(a, 'hex')); break;
    case 'answer':    this.write([7]); this.write(new Buffer(a, 'hex')); break;

    case 'ping':    c = 8;
    case 'pong':    if (c === -1) c = 12;
    case 'abort':   if (c === -1) c = 16;
    case 'drained': if (c === -1) c = 20;
    case 'plug':    if (c === -1) c = 24;

      if (a <= 0xff) {
        this.write([c, a]);
      } else if (a <= 0xffff) {
        this.write([c + 1, (a / 0x100) & 0xff, a & 0xff]);
      } else if (a <= 0xffffff) {
        this.write([c + 2, (a / 0x10000) & 0xff, (a / 0x100) & 0xff, a & 0xff]);
      } else {
        this.write([c + 3, (a / 0x1000000) & 0xff, (a / 0x10000) & 0xff,
                    (a / 0x100) & 0xff, a & 0xff]);
      }

      break;

    case 'message':

      l = a.length;

      if (l <= 0xff) {
        this.write([28, l]);
      } else if (l <= 0xffff) {
        this.write([29, (l & 0xff00) & 0xff, l & 0xff]);
      } else if (l <= 0xffffff) {
        this.write([30, (l & 0xff0000) & 0xff, (l & 0xff00) & 0xff, l & 0xff]);
      } else {
        this.write([31, (l & 0xff000000) & 0xff, (l & 0xff0000) & 0xff,
                    (l & 0xff00) & 0xff, l & 0xff]);
      }

      this.write(a);
      break;

    case 'buffer': c = 32;
    case 'chunk':  if (c === -1) c = 48;

      if (a <= 0xff) {
        o = [c, a];
      } else if (a <= 0xffff) {
        o = [c + 1, (a / 0x100) & 0xff, a & 0xff];
      } else if (a <= 0xffffff) {
        o = [c + 2, (a / 0x10000) & 0xff, (a / 0x100) & 0xff, a & 0xff];
      } else {
        o = [c + 3, (a / 0x1000000) & 0xff, (a / 0x10000) & 0xff,
             (a / 0x100) & 0xff, a & 0xff];
      }

      l = b.length;

      if (l <= 0xff) {
        o.push(l);
      } else if (l <= 0xffff) {
        o[0] += 1 << 2;
        o.concat([29, (l & 0xff00) & 0xff, l & 0xff]);
      } else if (l <= 0xffffff) {
        o[0] += 2 << 2;
        o.concat([30, (l & 0xff0000) & 0xff, (l & 0xff00) & 0xff, l & 0xff]);
      } else {
        o[0] += 3 << 2;
        o.concat([31, (l & 0xff000000) & 0xff, (l & 0xff0000) & 0xff,
                  (l & 0xff00) & 0xff, l & 0xff]);
      }

      this.write(o);
      this.write(b);
      break;

    default:
      this.emit('error', new Error('Unknown method: "' + method + '"'));
  }
};

module.exports = Channel;
