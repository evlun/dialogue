var n, s, EventEmitter = require('events').EventEmitter;

n = 0; s = {
  transition: n++,
  uint4:      n++,
  uint3:      n++,
  uint2:      n++,
  uint1:      n++,
  hex:        n++,
  hex_copy:   n++,
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

  this.writable = true;
  stream.pipe(this, { end: false });

  EventEmitter.call(this);
}

require('util').inherits(Parser, EventEmitter);

Parser.prototype.trigger = function(args) {
  this.emit('dispatch', args[0], args.slice(1));
  this.emit.apply(this, args);
};

Parser.prototype.write = function(chunk) {
  var end, b,
      offset = 0,
      length = chunk.length;

  while (offset < length) {
    if (this.state === s.transition) {
      if (this.queue.length === 0) {
        b = chunk[offset++];

        if (b >= 208) {
          if      (b >= 240) { this.out = ['backdraft_data']; }
          else if (b >= 224) { this.out = ['stream_data']; }
          else               { this.out = ['call']; }
          this.queue = [s.uint2, s.uint1 - (b >> 2 & 3), s.uint1 - (b & 3),
                        s.data];
        }

        else if (b >= 192) {
          this.out = ['buffer_pointer'];
          this.queue = [s.uint2, s.uint1 - (b >> 2 & 3), s.uint1 - (b & 3)];
        }

        else if (b >= 188) {
          this.out = ['buffer_source'];
          this.queue = [s.uint2, s.uint1 - (b & 3), s.data];
        }

        else if (b >= 172) {
          if      (b >= 184) { this.out = ['backdraft_sealed']; }
          else if (b >= 180) { this.out = ['stream_sealed']; }
          else if (b >= 176) { this.out = ['backdraft_ended']; }
          else               { this.out = ['stream_ended']; }
          this.queue = [s.uint2, s.uint1 - (b & 3)];
        }

        else if (b >= 168) {
          this.out = ['message'];
          this.queue = [s.uint2, s.uint1 - (b & 3), s.data];
        }

        else if (b >= 11) {
          this.emit('error', new Error('Parser: ' +
                                       'Unknown method in byte (' + b + ')'));
        }

        else if (b === 11) {
          this.out = ['acknowledge'];
          this.queue = [s.uint2];
        }

        else if (b >= 8) {
          if      (b === 10) { this.trigger(['destroy']); }
          else if (b ===  9) { this.trigger(['disconnect']); }
          else   /*b ===  8*/{ this.trigger(['restored']); }
          continue;
        }

        else if (b >= 4) {
          if      (b === 7) { this.out = ['solution']; }
          else if (b === 6) { this.out = ['challenge']; }
          else if (b === 5) { this.out = ['resume']; }
          else   /*b === 4*/{ this.out = ['established']; }
          this.queue = [s.hex];
        }

        else {
          if      (b === 3) { this.out = ['refuse']); }
          else if (b === 2) { this.out = ['cancel']); }
          else if (b === 1) { this.out = ['secure']; }
          else   /*b === 0*/{ this.out = ['connect']; }
          this.queue = [s.uint1];
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

      case s.hex:

        end = offset + 20;

        if (end > length) {
          this.hex = chunk.toString('hex', offset, length);
          this.progress = length - offset;
          this.state += 1;
          return;
        }

        this.out.push(chunk.toString('hex', offset, end));
        this.state = s.transition;
        offset = end;
        break;

      case s.hex_copy:

        end = offset + 20 - this.progress;

        if (end > length) {
          this.hex += chunk.toString('hex', offset, length);
          this.progress += length - offset;
          return;
        }

        this.out.push(this.hex + chunk.toString('hex', offset, end));
        this.progress = 0;
        this.state = s.transition;
        offset = end;
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
      this.trigger(this.out);
    }
  }
};

module.exports = Parser;
