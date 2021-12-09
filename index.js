/**
 * koa-body - index.js
 * Copyright(c) 2014
 * MIT Licensed
 *
 * @author  Daryl Lau (@dlau)
 * @author  Charlike Mike Reagent (@tunnckoCore)
 * @api private
 */

'use strict';

/**
 * Module dependencies.
 */

var buddy = require('co-body');
var forms = require('formidable');

/**
 * Expose `requestbody()`.
 */

module.exports = requestbody;

/**
 *
 * @param {Object} options
 * @see https://github.com/dlau/koa-body
 * @api public
 */
function requestbody(opts) {
  opts = opts || {};
  opts.onError = 'onError' in opts ? opts.onError : false;
  opts.patchNode = 'patchNode' in opts ? opts.patchNode : false;
  opts.patchKoa  = 'patchKoa'  in opts ? opts.patchKoa  : true;
  opts.multipart = 'multipart' in opts ? opts.multipart : false;
  opts.urlencoded = 'urlencoded' in opts ? opts.urlencoded : true;
  opts.json = 'json' in opts ? opts.json : true;
  opts.xml = 'xml' in opts ? opts.xml : true;
  opts.text = 'text' in opts ? opts.text : true;
  opts.encoding  = 'encoding'  in opts ? opts.encoding  : 'utf-8';
  opts.jsonLimit = 'jsonLimit' in opts ? opts.jsonLimit : '10mb';
  opts.xmlLimit = 'xmlLimit' in opts ? opts.xmlLimit : '10mb';
  opts.formLimit = 'formLimit' in opts ? opts.formLimit : '56kb';
  opts.formidable = 'formidable' in opts ? opts.formidable : {};
  opts.textLimit = 'textLimit' in opts ? opts.textLimit : '56kb';
  opts.strict = 'strict' in opts ? opts.strict : true;

  return function *(next){
    var body = {};
    // so don't parse the body in strict mode
    if (!opts.strict || ["GET", "HEAD", "DELETE"].indexOf(this.method.toUpperCase()) === -1) {
      try {
        if (opts.json && this.is('json'))  {
          body = yield buddy.json(this, {encoding: opts.encoding, limit: opts.jsonLimit, returnRawBody: true});
        }
        else if (opts.xml && this.is('xml')) {
          body = yield buddy.text(this, {encoding: opts.encoding, limit: opts.xmlLimit, returnRawBody: true});
        }
        else if (opts.urlencoded && this.is('urlencoded')) {
          body = yield buddy.form(this, {encoding: opts.encoding, limit: opts.formLimit, returnRawBody: true});
        }
        else if (opts.text && this.is('text')) {
          body = yield buddy.text(this, {encoding: opts.encoding, limit: opts.textLimit, returnRawBody: true});
        }
        else if (opts.multipart && this.is('multipart')) {
          body = yield formy(this, opts.formidable);
        }

      } catch(parsingError) {
        if (typeof(opts.onError) === 'function') {
          opts.onError(parsingError, this);
        } else {
          throw parsingError;
        }
      }
    }

    if (opts.patchNode) {
      this.req.body = body.parsed;
      this.req.bodyRaw = body.raw;
    }
    if (opts.patchKoa) {
      this.request.body = body.parsed;
      this.request.bodyRaw = body.raw;
    }
    yield next;
  };
}

/**
 * Donable formidable
 *
 * @param  {Stream} ctx
 * @param  {Object} opts
 * @return {Object}
 * @api private
 */
function formy(ctx, opts) {
  return function(done) {
    var fields = {};
    var files = {};
    var form = new forms.IncomingForm(opts)
    form
      .on('end', function() {
        done(null, {fields: fields, files: files});
      })
      .on('error', function(err) {
        done(err);
      })
      .on('field', function(field, value) {
        if (fields[field]) {
          if (Array.isArray(fields[field])) {
            fields[field].push(value);
          } else {
            fields[field] = [fields[field], value];
          }
        } else {
          fields[field] = value;
        }
      })
      .on('file', function(field, file) {
        if (files[field]) {
          if (Array.isArray(files[field])) {
            files[field].push(file);
          } else {
            files[field] = [files[field], file];
          }
        } else {
          files[field] = file;
        }
      });
    if(opts.onFileBegin) {
      form.on('fileBegin', opts.onFileBegin);
    }
    form.parse(ctx.req);
  };
}
