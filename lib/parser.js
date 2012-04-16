var n, s, EventEmitter = require('events').EventEmitter;

n = 0; s = {
  disabled:   n++,
  transition: n++,
  uint4:      n++,
  uint3:      n++,
  uint2:      n++,
  uint1:      n++,
  data:       n++,
  data_copy:  n++
};

function Parser(stream) {
  this.state = s.transition;

  this.queue = [];
  this.out = [];
  this.uint = 0;
  this.hex = '';
  this.data = null;
  this.progress = 0;

  var self = this;
  stream.on('data', function(chunk) {
    self.write(chunk);
  });

  EventEmitter.call(this);
}

require('util').inherits(Parser, EventEmitter);

Parser.prototype.write = function(chunk) {
  var end, b,
      offset = 0,
      length = chunk.length;

  if (this.state === s.disabled) return;

  while (offset < length) {
    if (this.state === s.transition) {
      if (this.queue.length === 0) {
        b = chunk[offset++];

        if (b > 63 || b < 20) {
          this.state = s.disabled;
          return;
          // @todo: emit error
        }

        else if (b >= 32) {
          this.out = b >= 48 ? ['data'] : ['call'];
          this.queue = [s.uint1 - (b >> 2 & 3), s.uint1 - (b & 3), s.data];
        }

        else if (b >= 28) {
          this.out = ['message'];
          this.queue = [s.uint1 - (b & 3), s.data];
        }

        else if (b >= 20) {
          this.out = b >= 24 ? ['seal'] : ['end'];
          this.queue = [s.uint1 - (b & 3)];
        }
      }

      this.state = this.queue.shift();

      if (this.state !== s.data) {
        this.uint = 0;
      }
    }

    switch (this.state) {
      case s.uint4:

        this.uint += 0x1000000 * chunk[offset++];
        this.state += 1;
        if (offset === length) break;

      case s.uint3:

        this.uint += 0x10000 * chunk[offset++];
        this.state += 1;
        if (offset === length) break;

      case s.uint2:

        this.uint += 0x100 * chunk[offset++];
        this.state += 1;
        if (offset === length) break;

      case s.uint1:

        this.uint += chunk[offset++];
        this.out.push(this.uint);
        this.state = s.transition;
        break;

      case s.data:

        end = offset + this.uint;

        if (end > length) {
          this.data = new Buffer(this.uint);
          this.progress = chunk.copy(this.data, 0, offset, length);
          this.state += 1;
          return;
        }

        this.state = s.transition;
        this.out[this.out.length - 1] = chunk.slice(offset, end);
        offset = end;
        break;

      case s.data_copy:

        end = offset + this.uint - this.progress;

        if (end > length) {
          this.progress += chunk.copy(this.data, this.progress, offset, length);
          return;
        }

        chunk.copy(this.data, this.progress, offset, length);
        this.progress = 0;
        this.state = s.transition;
        this.out[this.out.length - 1] = this.data;
        this.data = null;
        offset = end;
        break;
    }

    if (this.state === s.transition && this.queue.length === 0) {
      this.emit.apply(this, this.out);
    }
  }
};

module.exports = Parser;
