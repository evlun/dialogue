var EventEmitter = require('events').EventEmitter;

function Handle(socket) {
  this.socket = socket;

  EventEmitter.call(this);
}

require('util').inherits(Handle, EventEmitter);

Handle.prototype.send = function(method, a, b, c) {
  var o, s, m = -1,
      socket = this.socket;

  switch (method) {
    case 'message':

      s = b.length;

      if (s <= 0xff) {
        socket.write(new Buffer([172, a/0x100&0xff, a&0xff, s]));
      } else if (s <= 0xffff) {
        socket.write(new Buffer([172 | 1, a/0x100&0xff, a&0xff,
          s/0x100&0xff, s&0xff]));
      } else if (s <= 0xffffff) {
        socket.write(new Buffer([172 | 2, a/0x100&0xff, a&0xff,
          s/0x10000&0xff, s/0x100&0xff, s&0xff]));
      } else {
        socket.write(new Buffer([172 | 3, a/0x100&0xff, a&0xff,
          s/0x1000000&0xff, s/0x10000&0xff, s/0x100&0xff, s&0xff]));
      }

      socket.write(b);
      break;

    case 'buffer': m = 192;
    case 'call':   if (!~m) m = 208;
    case 'pump':   if (!~m) m = 224;
    case 'feed':   if (!~m) m = 240;

      s = c.length;
      o = [m, a/0x100&0xff, a&0xff];

      if (b <= 0xff) {
        o.push(b);
      } else if (b <= 0xffff) {
        o[0] |= 1 << 2;
        o.push(b/0x100&0xff);
        o.push(b&0xff);
      } else if (b <= 0xffffff) {
        o[0] |= 2 << 2;
        o.push(b/0x10000&0xff);
        o.push(b/0x100&0xff);
        o.push(b&0xff);
      } else {
        o[0] |= 3 << 2;
        o.push(b/0x1000000&0xff);
        o.push(b/0x10000&0xff);
        o.push(b/0x100&0xff);
        o.push(b&0xff);
      }

      if (s <= 0xff) {
        o.push(s);
      } else if (s <= 0xffff) {
        o[0] |= 1;
        o.push(s/0x100&0xff);
        o.push(s&0xff);
      } else if (s <= 0xffffff) {
        o[0] |= 2;
        o.push(s/0x10000&0xff);
        o.push(s/0x100&0xff);
        o.push(s&0xff);
      } else {
        o[0] |= 3;
        o.push(s/0x1000000&0xff);
        o.push(s/0x10000&0xff);
        o.push(s/0x100&0xff);
        o.push(s&0xff);
      }

      socket.write(new Buffer(o));
      socket.write(c);
      break;

    case 'restored':    m = 170;
    case 'acknowledge': if (!~m) m = 171;

      this.socket.write(new Buffer([m, a/0x100&0xff, a&0xff]));
      break;

    case 'cancel': m = 176;
    case 'end':    if (!~m) m = 184;

      if (b) { m |= 4; }

      if (c <= 0xff) {
        socket.write(new Buffer([m, a/0x100&0xff, a&0xff, c]));
      } else if (c <= 0xffff) {
        socket.write(new Buffer([m | 1, a/0x100&0xff, a&0xff,
          c/0x100&0xff, c&0xff]));
      } else if (c <= 0xffffff) {
        socket.write(new Buffer([m | 2, a/0x100&0xff, a&0xff,
          c/0x10000&0xff, c/0x100&0xff, c&0xff]));
      } else {
        socket.write(new Buffer([m | 3, a/0x100&0xff, a&0xff,
          c/0x1000000&0xff, c/0x10000&0xff, c/0x100&0xff, c&0xff]));
      }

      break;

    case 'connect':      m = 0;
    case 'authenticate': if (!~m) m = 1;
    case 'error':        if (!~m) m = 2;

      socket.write(new Buffer([m, a]));
      break;

    case 'challenge':   m = 166;
    case 'solution':    if (!~m) m = 167;
    case 'established': if (!~m) m = 168;
    case 'resume':      if (!~m) m = 169;

      socket.write(new Buffer([m]));
      socket.write(new Buffer(a, 'hex'));
      if (method === 'resume')
        socket.write(new Buffer([b/0x100&0xff, b&0xff]));
      break;

    case 'disconnect':

      socket.write(new Buffer([3]));
      break;
  }
};

module.exports = Handle;
