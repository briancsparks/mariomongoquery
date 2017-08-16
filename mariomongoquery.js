
/**
 *
 */
const sg                      = require('sgsg');
const _                       = sg._;

var lib = {};
_.each(require('./lib/check'), (v,k) => { lib[k]=v; });
_.each(require('./lib/fixup'), (v,k) => { lib[k]=v; });


_.each(lib, (value, key) => {
  exports[key] = value;
});

