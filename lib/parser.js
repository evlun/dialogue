var s, n = 0;

s = { // parser states
  clean:           n++,
  failed:          n++,
  accept_blank:    n++,  accept_hex:      n++,  accept:          n++,
  restore_blank:   n++,  restore_hex:     n++,  restore:         n++,
  challenge_blank: n++,  challenge_hex:   n++,  challenge:       n++,
  answer_blank:    n++,  answer_hex:      n++,  answer:          n++,
  ping_ref04:      n++,  ping_ref03:      n++,  ping_ref02:      n++,
  ping_ref01:      n++,  ping:            n++,
  pong_ref04:      n++,  pong_ref03:      n++,  pong_ref02:      n++,
  pong_ref01:      n++,  pong:            n++,
  abort_ref04:     n++,  abort_ref03:     n++,  abort_ref02:     n++,
  abort_ref01:     n++,  abort:           n++,
  drained_ref04:   n++,  drained_ref03:   n++,  drained_ref02:   n++,
  drained_ref01:   n++,  drained:         n++,
  plug_ref04:      n++,  plug_ref03:      n++,  plug_ref02:      n++,
  plug_ref01:      n++,  plug:            n++,
  message_size04:  n++,  message_size03:  n++,  message_size02:  n++,
  message_size01:  n++,  message_setup:   n++,  message_data:    n++,
  message:         n++,
  buffer_ref04:    n++,  buffer_ref03:    n++,  buffer_ref02:    n++,
  buffer_ref01:    n++,  buffer_size04:   n++,  buffer_size03:   n++,
  buffer_size02:   n++,  buffer_size01:   n++,  buffer_setup:    n++,
  buffer_data:     n++,  buffer:          n++,
  chunk_ref04:     n++,  chunk_ref03:     n++,  chunk_ref02:     n++,
  chunk_ref01:     n++,  chunk_size04:    n++,  chunk_size03:    n++,
  chunk_size02:    n++,  chunk_size01:    n++,  chunk_setup:     n++,
  chunk_data:      n++,  chunk:           n++
};

function Parser(listener) {
  this.listener = listener;

  this.state = s.clean;
  this.uint = 0;
  this.ref = 0;
  this.size = 0;
  this.hex = '';
  this.buffer = null;
  this.progress = 0;
  this.secondary = 0;
}

Parser.prototype.emit = function() {
  this.state = s.clean;
  this.listener.apply(this.listener, Array.prototype.slice.call(arguments));
};

Parser.prototype.fail = function(message) {
  this.state = s.failed;
  this.listener.call(this.listener, 'error', new Error(message));
};

Parser.prototype.feed = function(chunk) {
  if (this.state === s.failed) { return; }

  var byte, end,
      length = chunk.length,
      offset = 0;

  while (offset !== length) {
    if (this.state === s.clean) {
      byte = chunk[offset++];

      if      (byte === 0) { this.emit('link'); continue; }
      else if (byte === 1) { this.emit('auth'); continue; }
      else if (byte === 2) { this.emit('allow'); continue; }
      else if (byte === 3) { this.emit('end'); continue; }
      else if (byte === 4) { this.state = s.accept_blank; }
      else if (byte === 5) { this.state = s.restore_blank; }
      else if (byte === 6) { this.state = s.challenge_blank; }
      else if (byte === 7) { this.state = s.answer_blank; }
      else if (byte <= 11) { this.state = s.ping_ref01 - (byte & 3); }
      else if (byte <= 15) { this.state = s.pong_ref01 - (byte & 3); }
      else if (byte <= 19) { this.state = s.abort_ref01 - (byte & 3); }
      else if (byte <= 23) { this.state = s.plug_ref01 - (byte & 3); }
      else if (byte <= 27) { this.state = s.drained_ref01 - (byte & 3); }
      else if (byte <= 31) { this.state = s.message_size01 - (byte & 3); }
      else if (byte <= 47) { this.state = s.buffer_ref01 - (byte & 3);
                             this.secondary = (byte & 12) >> 2; }
      else if (byte <= 63) { this.state = s.chunk_ref01 - (byte & 3);
                             this.secondary = (byte & 12) >> 2; }
      else                 { this.fail(); return; }

      if (offset === length) { break; }
    }

    switch (this.state) {
      case s.ping_ref04:      case s.pong_ref04:      case s.abort_ref04:
      case s.drained_ref04:   case s.plug_ref04:      case s.buffer_ref04:
      case s.chunk_ref04:     case s.message_size04:  case s.buffer_size04:
      case s.chunk_size04:

        this.uint += chunk[offset++] * 0x1000000;
        this.state += 1;
        if (offset === length) { break; }

      case s.ping_ref03:      case s.pong_ref03:      case s.abort_ref03:
      case s.drained_ref03:   case s.plug_ref03:      case s.buffer_ref03:
      case s.chunk_ref03:     case s.message_size03:  case s.buffer_size03:
      case s.chunk_size03:

        this.uint += chunk[offset++] * 0x10000;
        this.state += 1;
        if (offset === length) { break; }

      case s.ping_ref02:      case s.pong_ref02:      case s.abort_ref02:
      case s.drained_ref02:   case s.plug_ref02:      case s.buffer_ref02:
      case s.chunk_ref02:     case s.message_size02:  case s.buffer_size02:
      case s.chunk_size02:

        this.uint += chunk[offset++] * 0x100;
        this.state += 1;

        if (offset !== length) {
          switch (this.state) {
            case s.buffer_ref01:    case s.chunk_ref01:
              this.ref = this.uint + chunk[offset++];
              this.state += 3 - this.secondary;
              break;

            case s.message_size01:  case s.buffer_size01:   case s.chunk_size01:
              this.size = this.uint + chunk[offset++];
              break;

            default:
              this.ref = this.uint + chunk[offset++];
          }

          this.state += 1;
          this.uint = 0;
        }
        break;

      case s.ping_ref01:      case s.pong_ref01:      case s.abort_ref01:
      case s.drained_ref01:   case s.plug_ref01:

        this.ref = this.uint + chunk[offset++];
        this.state += 1;
        this.uint = 0;
        break;

      case s.buffer_ref01:    case s.chunk_ref01:

        this.ref = this.uint + chunk[offset++];
        this.state += 4 - this.secondary;
        this.uint = 0;
        break;

      case s.message_size01:  case s.buffer_size01:   case s.chunk_size01:

        this.size = this.uint + chunk[offset++];
        this.state += 1;
        this.uint = 0;
        break;

      case s.accept_blank:    case s.restore_blank:   case s.challenge_blank:
      case s.answer_blank:

        end = offset + 20;

        if (end > length) {
          this.hex = chunk.toString('hex', offset, length);
          this.progress = length - offset;
          this.state += 1;
          return;
        }

        this.hex = chunk.toString('hex', offset, end);
        this.state += 2;
        offset = end;
        break;

      case s.accept_hex:      case s.restore_hex:     case s.challenge_hex:
      case s.answer_hex:

        end = offset + (20 - this.progress);

        if (end > length) {
          this.hex += chunk.toString('hex', offset, length);
          this.progress += length - offset;
          return;
        }

        this.hex += chunk.toString('hex', offset, end);
        this.state += 1;
        offset = end;
        break;

      case s.message_setup:   case s.buffer_setup:    case s.chunk_setup:

        end = offset + this.size;

        if (end > length) {
          this.buffer = new Buffer(this.size);
          chunk.copy(this.buffer, 0, offset, length);
          this.progress = length - offset;
          this.state += 1;
          return;
        }

        this.buffer = chunk.slice(offset, end);
        this.state += 2;
        offset = end;
        break;

      case s.message_data:    case s.buffer_data:     case s.chunk_data:

        end = offset + (this.size - this.progress);

        if (end > length) {
          chunk.copy(this.buffer, this.progress, offset, length);
          this.progress += length - offset;
          return;
        }

        chunk.copy(this.buffer, this.progress, offset, end);
        this.state += 1;
        offset = end;
        break;
    }

    switch (this.state) {
      case s.accept:    this.emit('accept', this.hex); break;
      case s.restore:   this.emit('restore', this.hex); break;
      case s.challenge: this.emit('challenge', this.hex); break;
      case s.answer:    this.emit('answer', this.hex); break;
      case s.ping:      this.emit('ping', this.ref); break;
      case s.pong:      this.emit('pong', this.ref); break;
      case s.abort:     this.emit('abort', this.ref); break;
      case s.drained:   this.emit('drained', this.ref); break;
      case s.plug:      this.emit('plug', this.ref); break;
      case s.message:   this.emit('message', this.buffer); break;
      case s.buffer:    this.emit('buffer', this.ref, this.buffer); break;
      case s.chunk:     this.emit('chunk', this.ref, this.buffer); break;
    }
  }
};

module.exports = Parser;
