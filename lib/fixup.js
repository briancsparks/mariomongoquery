
/**
 *
 */
const sg                      = require('sgsg');
const _                       = sg._;
const serverassist            = sg.include('serverassist') || require('serverassist');
const MongoClient             = require('mongodb').MongoClient;

const argvGet                 = sg.argvGet;
const setOnn                  = sg.setOnn;

var lib = {};

lib.fixup = function(argv, context, callback) {

  const dbname      = argvGet(argv, 'db-name,db');

  const mongoHost   = serverassist.mongoHost(dbname);

  return MongoClient.connect(mongoHost, function(err, db) {
    if (err) { return sg.die(err, callback, 'promoteToMain.MongoClient.connect'); }

    const clientsDb     = db.collection('userconfs');

    var result = {debug:{msgs:[], errors:[]}};
    return sg.__run2(result, done, [function(result, next, last, abort) {
      const query = {uid:{$exists:true}, clientId:{$exists:false}};
      return clientsDb.find(query).toArray((err, uids) => {
        if (err) { return abort(err); }

        result.uids = uids;
        return next();
      });

    }, function(result, next, last, abort) {

      var numFixed = 0;
      return sg.__each(result.uids, (uid, nextUid) => {
        if (numFixed > 9) { return nextUid(); }

        return clientsDb.find({clientId:uid.uid, uid:{$exists:false}}).toArray((err, clients) => {
          if (err)                                  { return abort(err); }
          if (!clients || clients.length === 0)     { return nextUid(); }

          if (clients.length > 1) {
            result.debug.errors.push({msg:`Skipping ${uid.uid}, too many clients`, clients});
            return nextUid();
          }

          const client = clients[0];

          result.debug.msgs.push({msg:`Fixing ${uid.uid}`, uid, client});

          var   uid_    = sg.deepCopy(uid);
          var   ops     = [];
          var   update  = {};

          const uid_id  = sg.extract(uid_, '_id');

          sg.extracts(uid_, 'launchSessionId');

          setOnn(update, ['$min', 'ctime'], sg.extract(uid_, 'ctime'));
          setOnn(update, ['$max', 'mtime'], sg.extract(uid_, 'mtime'));
          setOnn(update, ['$max', 'atime'], sg.extract(uid_, 'atime'));

          const knownKeys = 'uid,preAllocateJobId';
          _.each(knownKeys.split(','), key => {
            if (!(key in client)) {
              setOnn(update, ['$set', key], sg.extract(uid_, key));
            }
          });

          // Skip if any keys remain
          if (sg.numKeys(uid_) > 0) {
            result.debug.msgs.push({skipping: uid_});
            return nextUid();
          }

          ops.push({updateOne:{filter:{_id:client._id}, update}});
          ops.push({deleteOne:{filter:{_id:uid._id}}});

          result.debug.msgs.push(ops);

//          numFixed++;
//          return nextUid();

          return clientsDb.bulkWrite(ops, (err, writeResult) => {
            if (err) { result.debug.errors.push(err); return nextUid(); }

            result.debug.msgs.push({writeResult});

            numFixed++;
            return nextUid();
          });
        });
      }, next);

    }, function(result, next) {
      const errors = result.debug.errors;
      delete result.debug.errors;
      result.debug.errors = errors;

      return next();
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

