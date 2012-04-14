function assemble(stream, method, params) {
  var ret, t, b, r, s, l, o,
      m = -1;

  switch (method) {
    case 'connect': m = 0;
    case 'secure':  if (!~m) m = 1;
    case 'cancel':  if (!~m) m = 2;
    case 'refuse':  if (!~m) m = 3;

      ret = stream.write(new Buffer([m, params[0]]));
      break;

    case 'established': m = 4;
    case 'resume':      if (!~m) m = 5;
    case 'challenge':   if (!~m) m = 6;
    case 'solution':    if (!~m) m = 7;

      stream.write(new Buffer([m]));
      ret = stream.write(new Buffer(params[0], 'hex'));
      break;

    case 'restored': m = 8;
    case 'seal':     if (!~m) m = 9;
    case 'end':      if (!~m) m = 10;

      ret = stream.write(new Buffer([m]));
      break;

    case 'acknowledge':

      t = params[0];
      ret = stream.write(new Buffer([11, t / 0x100 & 0xff, t & 0xff]));
      break;

    case 'message':      m = 168;
    case 'buffer_source': if (!~m) m = 188;

      t = params[0];
      b = params[1];
      s = b.length;

      if (s <= 0xff) {
        stream.write(new Buffer([
          m,
          t / 0x100 & 0xff, t & 0xff,
          s
        ]));
      } else if (s <= 0xffff) {
        stream.write(new Buffer([
          m | 1,
          t / 0x100 & 0xff, t & 0xff,
          s / 0x100 & 0xff, s & 0xff
        ]));
      } else if (s <= 0xffffff) {
        stream.write(new Buffer([
          m | 2,
          t / 0x100 & 0xff, t & 0xff,
          s / 0x10000 & 0xff, s / 0x100 & 0xff, s & 0xff
        ]));
      } else {
        stream.write(new Buffer([
          m | 3,
          t / 0x100 & 0xff, t & 0xff,
          s / 0x1000000 & 0xff, s / 0x10000 & 0xff, s / 0x100 & 0xff, s & 0xff
        ]));
      }

      ret = stream.write(b);
      break;

    case 'stream_ended':     m = 172;
    case 'backdraft_ended':  if (!~m) m = 176;
    case 'stream_sealed':    if (!~m) m = 180;
    case 'backdraft_sealed': if (!~m) m = 184;

      t = params[0];
      r = params[1];

      if (r <= 0xff) {
        stream.write(new Buffer([
          m,
          t / 0x100 & 0xff, t & 0xff,
          r
        ]));
      } else if (r <= 0xffff) {
        stream.write(new Buffer([
          m | 1,
          t / 0x100 & 0xff, t & 0xff,
          r / 0x100 & 0xff, r & 0xff
        ]));
      } else if (r <= 0xffffff) {
        stream.write(new Buffer([
          m | 2,
          t / 0x100 & 0xff, t & 0xff,
          r / 0x10000 & 0xff, r / 0x100 & 0xff, r & 0xff
        ]));
      } else {
        stream.write(new Buffer([
          m | 3,
          t / 0x100 & 0xff, t & 0xff,
          r / 0x1000000 & 0xff, r / 0x10000 & 0xff, r / 0x100 & 0xff, r & 0xff
        ]));
      }

      break;

    case 'buffer_pointer':

      t = params[0];
      s = params[1];
      l = params[2];

      if (s <= 0xff) {
        o = [192, t / 0x100 & 0xff, t & 0xff, l];
      } else if (s <= 0xffff) {
        o = [
          192 | 4,
          t / 0x100 & 0xff, t & 0xff,
          l / 0x100 & 0xff, l & 0xff
        ];
      } else if (s <= 0xffffff) {
        o = [
          192 | 8,
          t / 0x100 & 0xff, t & 0xff,
          l / 0x10000 & 0xff, l / 0x100 & 0xff, l & 0xff
        ];
      } else {
        o = [
          192 | 12,
          t / 0x100 & 0xff, t & 0xff,
          l / 0x1000000 & 0xff, l / 0x10000 & 0xff, l / 0x100 & 0xff, l & 0xff
        ];
      }

      if (l <= 0xff) {
        o.push(l);
      } else if (l <= 0xffff) {
        o[0] |= 1;
        o.push(l / 0x100 & 0xff);
        o.push(l & 0xff);
      } else if (l <= 0xffffff) {
        o[0] |= 2;
        o.push(l / 0x10000 & 0xff);
        o.push(l / 0x100 & 0xff);
        o.push(l & 0xff);
      } else {
        o[0] |= 3;
        o.push(l / 0x1000000 & 0xff);
        o.push(l / 0x10000 & 0xff);
        o.push(l / 0x100 & 0xff);
        o.push(l & 0xff);
      }

      ret = stream.write(new Buffer(o));
      break;

    case 'call':           m = 208;
    case 'stream_data':    if (!~m) m = 224;
    case 'backdraft_data': if (!~m) m = 240;

      t = params[0];
      r = params[1];
      b = params[2];
      s = b.length;

      if (r <= 0xff) {
        o = [m, t / 0x100 & 0xff, t & 0xff, r];
      } else if (r <= 0xffff) {
        o = [
          m | 4,
          t / 0x100 & 0xff, t & 0xff,
          r / 0x100 & 0xff, r & 0xff
        ];
      } else if (r <= 0xffffff) {
        o = [
          m | 8,
          t / 0x100 & 0xff, t & 0xff,
          r / 0x10000 & 0xff, r / 0x100 & 0xff, r & 0xff
        ];
      } else {
        o = [
          m | 12,
          t / 0x100 & 0xff, t & 0xff,
          r / 0x1000000 & 0xff, r / 0x10000 & 0xff, r / 0x100 & 0xff, r & 0xff
        ];
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
