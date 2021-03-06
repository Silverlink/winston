/*
 * container.js: Inversion of control container for winston logger instances
 *
 * (C) 2010 Charlie Robbins
 * MIT LICENCE
 *
 */

 var common = require('./common'),
     Logger = require('./logger').Logger,
     winston = require('../winston'),
     util = require('util'),
     _ = require('lodash');

//
// ### function Container (options)
// #### @options {Object} Default pass-thru options for Loggers
// Constructor function for the Container object responsible for managing
// a set of `winston.Logger` instances based on string ids.
//
var Container = exports.Container = function (options) {
  Logger.call(this, options);
  this.loggers = {};
  this.options = _.omit(options, 'transports') || {};
  this.default = {
    transports: [
      new winston.transports.Console()
    ]
  };
};

//
// Inherit from `Logger`.
//
util.inherits(Container, Logger);

//
// ### function logger (id, options)
// #### @id {string} Id of the Logger to get
// #### @options {Object} **Optional** Options for the Logger instance
// Retreives a `winston.Logger` instance for the specified `id`. If
// an instance does not exist, one is created.
//
Container.prototype.logger = function (id, options) {
  var existing;
  if (!this.loggers[id]) {
    //
    // Remark: Simple shallow clone for configuration options in case we pass in
    // instantiated protoypal objects
    //
    options = _.extend({}, options || this.options || this.default);
    existing = options.transports || this.options.transports;
    //
    // Remark: Make sure if we have an array of transports we slice it to make copies
    // of those references.
    //
    options.transports = existing ? existing.slice() : [];

    if (options.transports.length === 0 &&
       (!options || !options['console']) &&
       _.isEmpty(this.transports)) {
      options.transports.push(this.default.transports[0]);
    }

    Object.keys(options).forEach(function (key) {
      if (key === 'transports') {
        return;
      }

      var name = common.capitalize(key);

      if (!winston.transports[name]) {
        throw new Error('Cannot add unknown transport: ' + name);
      }

      var namedOptions = options[key];
      namedOptions.id = id;
      options.transports.push(new (winston.transports[name])(namedOptions));
    });

    this.loggers[id] = new winston.Logger(_.extend(options, {parentLogger:false}));
    if (!_.isEmpty(this.transports) &&
			_.isEmpty(options.transports)) {
      this.loggers[id].transports = this.transports;
      this.loggers[id]._names = _.keys(this.transports);
		}
  }

  return this.loggers[id];
};

//
// ### function close (id)
// #### @id {string} **Optional** Id of the Logger instance to find
// Returns a boolean value indicating if this instance
// has a logger with the specified `id`.
//
Container.prototype.has = function (id) {
  return !!this.loggers[id];
};

//
// ### function close (id)
// #### @id {string} **Optional** Id of the Logger instance to close
// Closes a `Logger` instance with the specified `id` if it exists.
// If no `id` is supplied then all Loggers are closed.
//
Container.prototype.close = function (id) {
  var self = this;

  function _close (id) {
    if (!self.loggers[id]) {
      return;
    }

    self.loggers[id].close();
    delete self.loggers[id];
  }

  if (id) {
    _close(id);
  }
  else {
    Object.keys(this.loggers).forEach(function (id) {
      _close(id);
    });
    this.constructor.prototype.close.call(this);
  }
};
