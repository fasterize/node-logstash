var base_output = require('../lib/base_output'),
  cache_helper = require('../lib/cache_helper'),
  util = require('util'),
  dgram = require('dgram'),
  dns = require('dns'),
  logger = require('log4node'),
  error_buffer = require('../lib/error_buffer');

function AbstractUdp() {
  base_output.BaseOutput.call(this);
  this.mergeConfig(cache_helper.config());
  this.mergeConfig(error_buffer.config(function() {
    return 'output udp to ' + this.host + ':' + this.port;
  }));
  this.mergeConfig({
    name: 'AbstractUdp',
    host_field: 'host',
    port_field: 'port',
    start_hook: this.startAbstract,
  });
}

util.inherits(AbstractUdp, base_output.BaseOutput);

AbstractUdp.prototype.startAbstract = function(callback) {
  logger.info('Start output to ' + this.to());

  this.socket = dgram.createSocket('udp4');

  this.cache_miss = function(key, callback) {
    dns.lookup(key, function(err, res) {
      callback(undefined, res);
    });
  };

  callback();
};

AbstractUdp.prototype.process = function(data) {
  this.formatPayload(data, function(message) {
    this.cache(this.host, function(err, host) {
      if (err) {
        logger.error('Unable to resolve host', this.host);
      }
      else {
        this.socket.send(message, 0, message.length, this.port, host, function(err, bytes) {
          if (err || bytes !== message.length) {
            this.error_buffer.emit('error', new Error('Error while send data to ' + this.host + ':' + this.port + ':' + err));
          }
          else {
            this.error_buffer.emit('ok');
          }
        }.bind(this));
      }
    }.bind(this));
  }.bind(this));
};

AbstractUdp.prototype.close = function(callback) {
  logger.info('Closing output to ' + this.to());
  this.socket.close();
  callback();
};

exports.AbstractUdp = AbstractUdp;
