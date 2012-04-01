var m,
    Parser = require('./parser'),
    EventEmitter = require('events').EventEmitter;

m = { // methods
  propose:    0x00,  open:       0x01,  accept:     0x02,  restore:    0x03,
  allow:      0x04,  challenge:  0x05,  solution:   0x06,  close:      0x07,
  terminate:  0x08,  ping:       0x09,  message:    0x0a,  buffer:     0x0b,
  data:       0x0c,  drained:    0x0d,  cancel:     0x0e,  call:       0x0f
};

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

Channel.prototype.send = function(method, a, b) {
  var buf, out, l,
      code = m[method] << 4;

  switch (method) {
    case 'propose':    case 'allow':      case 'close':

      this.stream.write(new Buffer([code]));
      break;

    case 'pong':

      code = (m.ping << 4) + (1 << 2);

    case 'restore':    case 'terminate':  case 'ping':       case 'drained':
    case 'cancel':

      if (a <= 0x000000ff) {
        this.stream.write(new Buffer([code, a]));
      } else if (a <= 0x0000ffff) {
        this.stream.write(new Buffer([
          code + 1,
          (a & 0x0000ff00) >> 8,
          (a & 0x000000ff)
        ]));
      } else if (a < 0x00ffffff) {
        this.stream.write(new Buffer([
          code + 2,
          (a & 0x00ff0000) >> 16,
          (a & 0x0000ff00) >> 8,
          (a & 0x000000ff)
        ]));
      } else {
        this.stream.write(new Buffer([
          code + 3,
          (a & 0xff000000) >> 24,
          (a & 0x00ff0000) >> 16,
          (a & 0x0000ff00) >> 8,
          (a & 0x000000ff)
        ]));
      }
      break;

    case 'challenge':  case 'solution':

      buf = new Buffer(21);
      buf[0] = code;
      buf.write(a, 1, 'hex');
      this.stream.write(buf);
      break;

    case 'open':       case 'accept':

      if (a <= 0x000000ff) {
        buf = new Buffer(22);
        buf[0] = code;
        buf[1] = a;
        buf.write(b, 2, 'hex');
      } else if (a <= 0x0000ffff) {
        buf = new Buffer(23);
        buf[0] = code + 1;
        buf[1] = (a & 0x0000ff00) >> 8;
        buf[2] = (a & 0x000000ff);
        buf.write(b, 3, 'hex');
      } else if (a < 0x00ffffff) {
        buf = new Buffer(24);
        buf[0] = code + 2;
        buf[1] = (a & 0x00ff0000) >> 16;
        buf[2] = (a & 0x0000ff00) >> 8;
        buf[3] = (a & 0x000000ff);
        buf.write(b, 4, 'hex');
      } else {
        buf = new Buffer(25);
        buf[0] = code + 3;
        buf[1] = (a & 0xff000000) >> 24;
        buf[2] = (a & 0x00ff0000) >> 16;
        buf[3] = (a & 0x0000ff00) >> 8;
        buf[4] = (a & 0x000000ff);
        buf.write(b, 5, 'hex');
      }

      this.stream.write(buf);
      break;

    case 'message':

      l = a.length;

      if (l <= 0x000000ff) {
        out = [l];
      } else if (a <= 0x0000ffff) {
        code += 1 << 2;
        out = [l & 0x0000ff00 >> 8,
               l & 0x000000ff];
      } else if (l < 0x00ffffff) {
        code += 2 << 2;
        out = [l & 0x00ff0000 >> 16,
               l & 0x0000ff00 >> 8,
               l & 0x000000ff];
      } else {
        code += 3 << 2;
        out = [l & 0xff000000 >> 24,
               l & 0x00ff0000 >> 16,
               l & 0x0000ff00 >> 8,
               l & 0x000000ff];
      }

      this.stream.write(new Buffer([code].concat(out)));
      this.stream.write(a);
      break;

    case 'buffer':     case 'data':       case 'call':

      if (a <= 0x000000ff) {
        out = [a];
      } else if (a <= 0x0000ffff) {
        code += 1;
        out = [(a & 0x0000ff00) >> 8, (a & 0x000000ff)];
      } else if (a < 0x00ffffff) {
        code += 2;
        out = [(a & 0x00ff0000) >> 16,
               (a & 0x0000ff00) >> 8,
               (a & 0x000000ff)];
      } else {
        code += 3;
        out = [(a & 0xff000000) >> 24,
               (a & 0x00ff0000) >> 16,
               (a & 0x0000ff00) >> 8,
               (a & 0x000000ff)];
      }

      l = b.length;

      if (l <= 0x000000ff) {
        out.push(l);
      } else if (a <= 0x0000ffff) {
        code += 1 << 2;
        out.concat([l & 0x0000ff00 >> 8,
                    l & 0x000000ff]);
      } else if (l < 0x00ffffff) {
        code += 2 << 2;
        out.concat([l & 0x00ff0000 >> 16,
                    l & 0x0000ff00 >> 8,
                    l & 0x000000ff]);
      } else {
        code += 3 << 2;
        out.concat([l & 0xff000000 >> 24,
                    l & 0x00ff0000 >> 16,
                    l & 0x0000ff00 >> 8,
                    l & 0x000000ff]);
      }

      this.stream.write(new Buffer([code].concat(out)));
      this.stream.write(b);
      break;

    default:
      this.emit('error', new Error('Unknown method: "' + method + '"'));
  }
};

module.exports = Channel;
