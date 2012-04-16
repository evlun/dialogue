function assemble(stream, method, a, b) {
  var ret, s, o, m = -1;

  switch (method) {
    case 'end':  m = 20;
    case 'seal': if (!~m) m = 24;

      if (a <= 0xff) {
        stream.write(new Buffer([m, a]));
      } else if (a <= 0xffff) {
        stream.write(new Buffer([m | 1, a / 0x100 & 0xff, a & 0xff]));
      } else if (a <= 0xffffff) {
        stream.write(new Buffer([ m | 2, a / 0x10000 & 0xff, a / 0x100 & 0xff,
          a & 0xff]));
      } else {
        stream.write(new Buffer([m | 3, a / 0x1000000 & 0xff,
          a / 0x10000 & 0xff, a / 0x100 & 0xff, a & 0xff ]));
      }

      break;

    case 'message':

      s = a.length;

      if (s <= 0xff) {
        stream.write(new Buffer([28, s]));
      } else if (s <= 0xffff) {
        stream.write(new Buffer([29, s / 0x100 & 0xff, s & 0xff]));
      } else if (s <= 0xffffff) {
        stream.write(new Buffer([30, s / 0x10000 & 0xff, s / 0x100 & 0xff,
          s & 0xff]));
      } else {
        stream.write(new Buffer([31, s / 0x1000000 & 0xff, s / 0x10000 & 0xff,
          s / 0x100 & 0xff, s & 0xff]));
      }

      ret = stream.write(a);
      break;

    case 'call':  m = 32;
    case 'data': if (!~m) m = 48;

      s = b.length;

      if (a <= 0xff) {
        o = [m, a];
      } else if (a <= 0xffff) {
        o = [m | 4, a / 0x100 & 0xff, a & 0xff];
      } else if (a <= 0xffffff) {
        o = [m | 8, a / 0x10000 & 0xff, a / 0x100 & 0xff, a & 0xff];
      } else {
        o = [m | 12, a / 0x1000000 & 0xff, a / 0x10000 & 0xff, a / 0x100 & 0xff,
          a & 0xff];
      }

      if (s <= 0xff) {
        o.push(s);
      } else if (s <= 0xffff) {
        o[0] |= 1;
        o.push(s / 0x100 & 0xff);
        o.push(s & 0xff);
      } else if (s <= 0xffffff) {
        o[0] |= 2;
        o.push(s / 0x10000 & 0xff);
        o.push(s / 0x100 & 0xff);
        o.push(s & 0xff);
      } else {
        o[0] |= 3;
        o.push(s / 0x1000000 & 0xff);
        o.push(s / 0x10000 & 0xff);
        o.push(s / 0x100 & 0xff);
        o.push(s & 0xff);
      }

      stream.write(new Buffer(o));
      ret = stream.write(b);
      break;
  }

  return ret;
}

module.exports = assemble;
