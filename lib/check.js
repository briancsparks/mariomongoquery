
/**
 *
 */
const sg                      = require('sgsg');
const _                       = sg._;
const serverassist            = sg.include('serverassist') || require('serverassist');
const MongoClient             = require('mongodb').MongoClient;

const argvGet                 = sg.argvGet;

var lib = {};

lib.check = function(argv, context, callback) {

  const dbname      = argvGet(argv, 'db-name,db');

  const mongoHost   = serverassist.mongoHost(dbname);

  return MongoClient.connect(mongoHost, function(err, db) {
    if (err) { return sg.die(err, callback, 'promoteToMain.MongoClient.connect'); }

    const clientsDb     = db.collection('userconfs');

    return sg.__run2({}, done, [function(result, next) {
      return clientsDb.find({}).toArray((err, clients) => {
        result.clients = clients;
        return next();
      });
    }]);


    function done() {
      db.close();
      return callback.apply(this, arguments);
    }
  });
};


_.each(lib, (value, key) => {
  exports[key] = value;
});

