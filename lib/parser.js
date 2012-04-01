var m, s,
    n = 0;

s = { // parser states
  clean:           n++,

  open_num01:      n++, open_num02:      n++, open_num03:      n++,
  open_num04:      n++, open_hex:        n++, open:            n++,

  accept_num01:    n++, accept_num02:    n++, accept_num03:    n++,
  accept_num04:    n++, accept_hex:      n++, accept:          n++,

  restore_num01:   n++, restore_num02:   n++, restore_num03:   n++,
  restore_num04:   n++, restore:         n++,

  challenge_hex:   n++, challenge:       n++,

  solution_hex:    n++, solution:        n++,

  terminate_num01: n++, terminate_num02: n++, terminate_num03: n++,
  terminate_num04: n++, terminate:       n++,

  ping_num01:      n++, ping_num02:      n++, ping_num03:      n++,
  ping_num04:      n++, ping:            n++,

  message_num01:   n++, message_num02:   n++, message_num03:   n++,
  message_num04:   n++, message_setup:   n++, message_copy:    n++,
  message:         n++,

  buffer_num01:    n++, buffer_num02:    n++, buffer_num03:    n++,
  buffer_num04:    n++, buffer_size:     n++, buffer_size01:   n++,
  buffer_size02:   n++, buffer_size03:   n++, buffer_size04:   n++,
  buffer_setup:    n++, buffer_copy:     n++, buffer:          n++,

  data_num01:      n++, data_num02:      n++, data_num03:      n++,
  data_num04:      n++, data_size:       n++, data_size01:     n++,
  data_size02:     n++, data_size03:     n++, data_size04:     n++,
  data_setup:      n++, data_copy:       n++, data:            n++,

  drained_num01:   n++, drained_num02:   n++, drained_num03:   n++,
  drained_num04:   n++, drained:         n++,

  cancel_num01:    n++, cancel_num02:    n++, cancel_num03:    n++,
  cancel_num04:    n++, cancel:          n++,

  call_num01:      n++, call_num02:      n++, call_num03:      n++,
  call_num04:      n++, call_size:       n++, call_size01:     n++,
  call_size02:     n++, call_size03:     n++, call_size04:     n++,
  call_setup:      n++, call_copy:       n++, call:            n++
};

m = { // methods
  propose:    0x00,  open:       0x01,  accept:     0x02,  restore:    0x03,
  allow:      0x04,  challenge:  0x05,  solution:   0x06,  close:      0x07,
  terminate:  0x08,  ping:       0x09,  message:    0x0a,  buffer:     0x0b,
  data:       0x0c,  drained:    0x0d,  cancel:     0x0e,  call:       0x0f
};

function Parser() {
  this.state = s.clean;
  this.hex = '';
  this.buffer = null;
  this.num = 0;
  this.size = 0;
  this.progress = 0;
  this.secondary = 0;
  this.disabled = false;
}

Parser.prototype.listener = function() {
  // dummy function, should be overwritten
};

Parser.prototype.trigger = function() {
  if (this.disabled) return;

  this.state = s.clean;
  this.hex = '';
  this.buffer = null;
  this.num = 0;
  this.size = 0;
  this.progress = 0;

  this.listener.apply(this.listener, Array.prototype.slice.call(arguments));
};

Parser.prototype.write = function(chunk) {
  var byte, method, primary, secondary, available, remaining,
      event = false,
      length = chunk.length,
      offset = 0;

  while (true) {
    switch (this.state) {
      case s.open:       this.trigger('open', this.num, this.hex); break;
      case s.accept:     this.trigger('accept', this.num, this.hex); break;
      case s.restore:    this.trigger('restore', this.num); break;
      case s.challenge:  this.trigger('challenge', this.hex); break;
      case s.solution:   this.trigger('solution', this.hex); break;
      case s.terminate:  this.trigger('terminate', this.num); break;
      case s.message:    this.trigger('message', this.buffer); break;
      case s.drained:    this.trigger('drained', this.num); break;
      case s.cancel:     this.trigger('cancel', this.num); break;

      case s.ping:       event = this.secondary === 0 ? 'ping' : 'pong';
                         this.trigger(event, this.num);
                         break;

      case s.data:       event = 'data';
      case s.call:       event = event || 'call';

                         this.trigger(event, this.num, this.buffer);
                         break;
    }

    if (offset === length) return;

    if (this.state === s.clean) {
      byte = chunk[offset++];
      method    = (byte & 240) >>> 4;  // 11110000
      secondary = (byte & 12) >>> 2;   // 00001100
      primary   = byte & 3;            // 00000011

      switch (method) {
        case m.open:       this.state = s.open_num04 - primary; break;
        case m.accept:     this.state = s.accept_num04 - primary; break;
        case m.restore:    this.state = s.restore_num04 - primary; break;
        case m.challenge:  this.state = s.challenge_num04 - primary; break;
        case m.solution:   this.state = s.solution_num04 - primary; break;
        case m.terminate:  this.state = s.terminate_num04 - primary; break;
        case m.ping:       this.state = s.ping_num04 - primary; break;
        case m.message:    this.state = s.message_num04 - primary; break;
        case m.buffer:     this.state = s.buffer_num04 - primary; break;
        case m.data:       this.state = s.data_num04 - primary; break;
        case m.drained:    this.state = s.drained_num04 - primary; break;
        case m.cancel:     this.state = s.cancel_num04 - primary; break;
        case m.call:       this.state = s.call_num04 - primary; break;

        case m.propose:    this.trigger('propose'); continue;
        case m.allow:      this.trigger('allow'); continue;
        case m.close:      this.trigger('close'); continue;
      }

      this.secondary = secondary;

      if (offset === length) return;
    }

    switch (this.state) {
      case s.open_num01:       case s.accept_num01:    case s.restore_num01:
      case s.challenge_num01:  case s.solution_num01:  case s.terminate_num01:
      case s.ping_num01:       case s.message_num01:   case s.buffer_num01:
      case s.data_num01:       case s.drained_num01:
      case s.cancel_num01:     case s.call_num01:

        this.num += chunk[offset++] << 24;
        this.state += 1;
        if (offset === length) break;

      case s.open_num02:       case s.accept_num02:    case s.restore_num02:
      case s.challenge_num02:  case s.solution_num02:  case s.terminate_num02:
      case s.ping_num02:       case s.message_num02:   case s.buffer_num02:
      case s.data_num02:       case s.drained_num02:
      case s.cancel_num02:     case s.call_num02:

        this.num += chunk[offset++] << 16;
        this.state += 1;
        if (offset === length) break;

      case s.open_num03:       case s.accept_num03:    case s.restore_num03:
      case s.challenge_num03:  case s.solution_num03:  case s.terminate_num03:
      case s.ping_num03:       case s.message_num03:   case s.buffer_num03:
      case s.data_num03:       case s.drained_num03:
      case s.cancel_num03:     case s.call_num03:

        this.num += chunk[offset++] << 8;
        this.state += 1;
        if (offset === length) break;

      case s.open_num04:       case s.accept_num04:    case s.restore_num04:
      case s.challenge_num04:  case s.solution_num04:  case s.terminate_num04:
      case s.ping_num04:       case s.message_num04:   case s.buffer_num04:
      case s.data_num04:       case s.drained_num04:
      case s.cancel_num04:     case s.call_num04:

        this.num += chunk[offset++];
        this.state += 1;
        break;

      case s.buffer_size:    case s.data_size:    case s.call_size:

        if (this.secondary === 3) {
          this.state += 1;
        } else {
          this.state += 4 - this.secondary;
          break;
        }

      case s.buffer_size01:  case s.data_size01:  case s.call_size01:

        this.size += chunk[offset++] << 24;
        this.state += 1;
        if (offset === length) break;

      case s.buffer_size02:  case s.data_size02:  case s.call_size02:

        this.size += chunk[offset++] << 16;
        this.state += 1;
        if (offset === length) break;

      case s.buffer_size03:  case s.data_size03:  case s.call_size03:

        this.size += chunk[offset++] << 8;
        this.state += 1;
        if (offset === length) break;

      case s.buffer_size04:  case s.data_size04:  case s.call_size04:

        this.size += chunk[offset++];
        this.state += 1;

        if (this.size === 0) {
          this.buffer = new Buffer(0);
          this.state += 2;
        }

        break;

      case s.open_hex:       case s.accept_hex:
      case s.challenge_hex:  case s.solution_hex:

        available = length - offset;
        remaining = 20 - this.progress;

        if (available < remaining) {
          this.hex += chunk.toString('hex', offset, offset + available);
          this.progress += available;
          return;
        }

        this.hex += chunk.toString('hex', offset, offset + remaining);
        this.state += 1;
        offset += remaining;

        break;

      case s.message_setup:

        this.size = this.num;

      case s.buffer_setup:   case s.data_setup:   case s.call_setup:

        if (length - offset >= this.size) {
          this.buffer = chunk.slice(offset, offset + this.size);
          this.state += 2;
          offset += this.size;
          break;
        }

        this.buffer = new Buffer(this.size);
        this.state += 1;

      case s.buffer_copy:    case s.data_copy:    case s.call_copy:

        available = length - offset;
        remaining = this.size - this.progress;

        if (available < remaining) {
          chunk.copy(this.buffer, this.progress, offset, offset + available);
          this.progress += available;
          return;
        }

        chunk.copy(this.buffer, this.progress, offset, offset + remaining);
        this.state += 1;
        offset += remaining;

        break;
    }
  }
};

module.exports = Parser;
