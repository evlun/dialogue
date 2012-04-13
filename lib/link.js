var EventEmitter = require('events').EventEmitter,
    Stream = require('stream'),
    rucksack = require('rucksack'),
    protocol = require('./protocol'),
    Backdraft = require('./backdraft');

function Link(options) {
  var self = this,
      handle = new EventEmitter();

  this.channel = null;
  this.handle = handle;

  this.ticket = 1;
  this.backlog = [];
  this.unconfirmed = [];

  handle.send = function(value) {
    self.queue('message', [self.serialize(value)]);
    return handle;
  };

  handle.end = function() {
    // @todo: make this do something
    return handle;
  };

  handle.destroy = function() {
    // @todo: make this do something
    return handle;
  };
}

Link.prototype.use = function(channel) {
  var self = this,
      socket = channel.socket;

  if (this.channel) {
    this.channel.abort(protocol.SWITCH_CHANNEL);
    this.removeListeners();
  }

  function dispatch(method, params) {
    switch (method) {
      case 'message':
        self.handle.emit('message', self.unserialize(params[1]));
        break;
    }
  }

  function drain() {
    self.flush();
  }

  function close() {
    self.channel = null;
    removeListeners();
  }

  function removeListeners() {
    channel.removeListener('dispatch', dispatch);
    channel.removeListener('drain', drain);
    channel.removeListener('close', close);
  }

  channel.on('dispatch', dispatch);
  channel.on('drain', drain);
  channel.on('close', close);

  this.channel = channel;
  this.removeListeners = removeListeners;

  this.flush();
};

Link.prototype.serialize = function(value) {
  var buf;

  buf = rucksack.pack(value, function(val, out, refs, pack) {
    if (value instanceof Buffer) {
      return pack(null); // @todo: Buffer support
    }

    if (value instanceof Function) {
      return pack(null); // @todo: Function support
    }

    if (value instanceof Backdraft) {
      return pack(null); // @todo: Backdraft support
    }

    if (value instanceof Stream) {
      return pack(null); // @todo: Stream support
    }
  });

  return buf;
};

Link.prototype.unserialize = function(buf) {
  var value;

  value = rucksack.unpack(buf, function(byte, input, refs, unpack) {
    switch (byte) {
      case 0xba: return null; // @todo: Buffer support
      case 0xbb: return null; // @todo: Function support
      case 0xbc: return null; // @todo: Stream support
      case 0xbd: return null; // @todo: Backdraft support
    }
  });

  return value;
};

Link.prototype.queue = function(method, params) {
  params.unshift(this.ticket++);

  if (this.channel && !this.channel.clogged) {
    this.unconfirmed.push([method, params]);
    this.channel.send(method, params);
  } else {
    this.backlog.push([method, params]);
  }
};

Link.prototype.flush = function() {
  var item;

  if (this.channel === null)
    return;

  while (!this.channel.clogged && this.backlog.length > 0) {
    item = this.backlog.shift();
    this.unconfirmed.push(item);
    this.channel.send(item[0], item[1]);
  }
};

module.exports = Link;
