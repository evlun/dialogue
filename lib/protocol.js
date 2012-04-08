var s, n = 0,
    EventEmitter = require('events').EventEmitter;

s = {
  clean:          n++,
  disabled:       n++,

  conn_version:   n++,
  auth_version:   n++,
  abort_errno:    n++,
  estd_hex:       n++,      estd_hex_cont:  n++,      estd_emit:      n++,
  chlng_hex:      n++,      chlng_hex_cont: n++,      chlng_emit:     n++,
  sltn_hex:       n++,      sltn_hex_cont:  n++,      sltn_emit:      n++,
  resm_hex:       n++,      resm_hex_cont:  n++,      resm_tckt:      n++,
  resm_tckt_cont: n++,      resm_emit:      n++,
  resd_tckt:      n++,      resd_tckt_cont: n++,      resd_emit:      n++,
  ack_tckt:       n++,      ack_tckt_cont:  n++,      ack_emit:       n++,
  msg_tckt:       n++,      msg_tckt_cont:  n++,      msg_size:       n++,
  msg_size_cont:  n++,      msg_data:       n++,      msg_data_cont:  n++,
  msg_emit:       n++,
  canc_tckt:      n++,      canc_tckt_cont: n++,      canc_ref:       n++,
  canc_ref_cont:  n++,      canc_emit:      n++,
  end_tckt:       n++,      end_tckt_cont:  n++,      end_ref:        n++,
  end_ref_cont:   n++,      end_emit:       n++,
  buf_tckt:       n++,      buf_tckt_cont:  n++,      buf_ref:        n++,
  buf_ref_cont:   n++,      buf_size:       n++,      buf_size_cont:  n++,
  buf_data:       n++,      buf_data_cont:  n++,      buf_emit:       n++,
  call_tckt:      n++,      call_tckt_cont: n++,      call_ref:       n++,
  call_ref_cont:  n++,      call_size:      n++,      call_size_cont: n++,
  call_data:      n++,      call_data_cont: n++,      call_emit:      n++,
  feed_tckt:      n++,      feed_tckt_cont: n++,      feed_ref:       n++,
  feed_ref_cont:  n++,      feed_size:      n++,      feed_size_cont: n++,
  feed_data:      n++,      feed_data_cont: n++,      feed_emit:      n++,
  pump_tckt:      n++,      pump_tckt_cont: n++,      pump_ref:       n++,
  pump_ref_cont:  n++,      pump_size:      n++,      pump_size_cont: n++,
  pump_data:      n++,      pump_data_cont: n++,      pump_emit:      n++
};

function Handle(socket) {
  var self = this;

  this.socket = socket;
  this.state = s.clean;

  socket.on('data', function(chunk) {
    if (self.state !== s.disabled) {
      self.parse(chunk);
    }
  });

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
    case 'abort':        if (!~m) m = 2;

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

Handle.prototype.trigger = function() {
  this.state = s.clean;

  var args = Array.prototype.slice.call(arguments);
  this.emit.apply(this, ['dispatch'].concat(args));
  this.emit.apply(this, args);
};

Handle.prototype.parse = function(chunk) {
  var byte, e,
      offset = 0,
      length = chunk.length;

  while (offset < length) {
    if (this.state === s.clean) {
      byte = chunk[offset++];

      if (byte >= 192) {
        this.state = byte >= 240 ? s.feed_tckt :
                     byte >= 224 ? s.pump_tckt :
                     byte >= 208 ? s.call_tckt : s.buf_tckt;
        this.reference_s = (byte & 12) >> 2;
        this.size_s = byte & 3;
      }

      else if (byte >= 176) {
        this.state = byte >= 184 ? s.end_tckt : s.canc_tckt;
        this.reverse = (byte & 4) !== 0;
        this.reference_s = byte & 3;
      }

      else if (byte >= 172) {
        this.state = s.msg_tckt;
        this.size_s = byte & 3;
      }

      else if (byte === 171) { this.state = s.ack_tckt; }
      else if (byte === 170) { this.state = s.resd_tckt; }

      else if (byte === 169) { this.state = s.resm_hex; }
      else if (byte === 168) { this.state = s.estd_hex; }
      else if (byte === 167) { this.state = s.sltn_hex; }
      else if (byte === 166) { this.state = s.chlng_hex; }

      else if (byte === 3) { this.trigger('disconnect'); continue; }

      else if (byte === 2) { this.state = s.abort_errno; }
      else if (byte === 1) { this.state = s.auth_version; }
      else if (byte === 0) { this.state = s.conn_version; }

      else {
        this.emit('error', new Error('Unknown method in byte ' + byte));
        this.state = s.disabled;
        return;
      }

      if (offset === length) { break; }
    }

    switch (this.state) {
      case s.conn_version:      e = 'connect';
      case s.auth_version: e = e || 'authenticate';
      case s.abort_errno:          e = e || 'abort';

        this.trigger(e, chunk[offset++]);
        continue;

      case s.resm_tckt:
      case s.resd_tckt:
      case s.ack_tckt:
      case s.msg_tckt:
      case s.canc_tckt:
      case s.end_tckt:
      case s.buf_tckt:
      case s.call_tckt:
      case s.pump_tckt:
      case s.feed_tckt:

        this.ticket = chunk[offset++] * 0x100;
        this.state += 1;
        break;

      case s.resm_tckt_cont:
      case s.resd_tckt_cont:
      case s.ack_tckt_cont:
      case s.msg_tckt_cont:
      case s.canc_tckt_cont:
      case s.end_tckt_cont:
      case s.buf_tckt_cont:
      case s.call_tckt_cont:
      case s.pump_tckt_cont:
      case s.feed_tckt_cont:

        this.ticket += chunk[offset++];
        this.state += 1;
        break;

      case s.msg_ref:
      case s.canc_ref:
      case s.end_ref:
      case s.buf_ref:
      case s.call_ref:
      case s.pump_ref:
      case s.feed_ref:

        this.reference = 0;
        this.state += 1;

      case s.msg_ref_cont:
      case s.canc_ref_cont:
      case s.end_ref_cont:
      case s.buf_ref_cont:
      case s.call_ref_cont:
      case s.pump_ref_cont:
      case s.feed_ref_cont:

        if (this.reference_s === 0) {
          this.reference += chunk[offset++];
          this.state += 1;
          break;
        } else if (this.reference_s === 1) {
          this.reference += chunk[offset++] * 0x100;
        } else if (this.reference_s === 2) {
          this.reference += chunk[offset++] * 0x10000;
        } else if (this.reference_s === 3) {
          this.reference += chunk[offset++] * 0x1000000;
        }

        this.reference_s -= 1;
        continue;

      case s.msg_size:
      case s.buf_size:
      case s.call_size:
      case s.pump_size:
      case s.feed_size:

        this.size = 0;
        this.state += 1;

      case s.msg_size_cont:
      case s.buf_size_cont:
      case s.call_size_cont:
      case s.pump_size_cont:
      case s.feed_size_cont:

        if (this.size_s === 0) {
          this.size += chunk[offset++];
          this.state += 1;
          break;
        } else if (this.size_s === 1) {
          this.size += chunk[offset++] * 0x100;
        } else if (this.size_s === 2) {
          this.size += chunk[offset++] * 0x10000;
        } else if (this.size_s === 3) {
          this.size += chunk[offset++] * 0x1000000;
        }

        this.size_s -= 1;
        continue;

      case s.estd_hex:
      case s.chlng_hex:
      case s.sltn_hex:
      case s.resm_hex:

        end = offset + 20;

        if (length < end) {
          this.hex = chunk.toString('hex', offset, length);
          this.progress = length - offset;
          this.state += 1;
          return;
        }

        this.hex = chunk.toString('hex', offset, end);
        this.state += 2; // skip x_hex_cont
        offset = end;
        break;

      case s.estd_hex_cont:
      case s.chlng_hex_cont:
      case s.sltn_hex_cont:
      case s.resm_hex_cont:

        end = offset + (20 - this.progress);

        if (length < end) {
          this.hex += chunk.toString('hex', offset, length);
          this.progress += length - offset;
          return;
        }

        this.hex += chunk.toString('hex', offset, end);
        this.state += 1;
        offset = end;
        break;

      case s.msg_data:
      case s.buf_data:
      case s.call_data:
      case s.pump_data:
      case s.feed_data:

        end = offset + this.size;

        if (length < end) {
          this.data = new Buffer(this.size);
          chunk.copy(this.data, 0, offset, length);
          this.progress = length - offset;
          this.state += 1;
          return;
        }

        this.data = chunk.slice(offset, end);
        this.state += 2; // skip x_data_cont
        offset = end;
        break;

      case s.msg_data_cont:
      case s.buf_data_cont:
      case s.call_data_cont:
      case s.pump_data_cont:
      case s.feed_data_cont:

        end = offset + (this.size - this.progress);

        if (length < end) {
          chunk.copy(this.data, this.progress, offset, length);
          this.progress += length - offset;
          return;
        }

        chunk.copy(this.data, this.progress, offset, end);
        this.state += 1;
        offset = end;
        break;
    }

    switch (this.state) {
      case s.msg_emit:

        this.trigger('message', this.ticket, this.data);
        break;

      case s.canc_emit: e = 'cancel';
      case s.end_emit:  e = e || 'end';

        this.trigger(e, this.reverse, this.ticket, this.reference);
        break;

      case s.feed_emit: e = 'feed';
      case s.pump_emit: e = e || 'pump';
      case s.call_emit: e = e || 'call';
      case s.buf_emit:  e = e || 'buffer';

        this.trigger(e, this.ticket, this.reference, this.data);
        break;

      case s.resm_emit:

        this.trigger('resume', this.hex, this.ticket);
        break;

      case s.resd_emit: e = 'restore';
      case s.ack_emit:  e = e || 'acknowledge';

        this.trigger(e, this.ticket);
        break;

      case s.estd_emit:  e = 'established';
      case s.chlng_emit: e = e || 'challenge';
      case s.sltn_emit:  e = e || 'solution';

        this.trigger(e, this.hex);
        break;
    }
  }
};

module.exports = Handle;
