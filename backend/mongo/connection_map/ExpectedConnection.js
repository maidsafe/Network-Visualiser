var mongoose = require('mongoose');
var config = require('./../../../Config');
var partialSort = require('./partialsort');
var bridge = require('./../bridge');
var socket = require('./../../socket/Socket');

module.exports = function(dbCon) {
  var MongoosePromise = mongoose.Promise;
  var instance = this;
  var COLLECTION_NAME_SUFFIX = '_expected_connection';
  var GeneralHandler = function(promise) {
    return function(err, doc) {
      if (err) {
        promise.error(err);
        return;
      }
      promise.complete(doc);
    };
  };
  var formatConnectionData = function(ts, vaultId, closeConnections) {
    return { ts: ts, vaultId: vaultId, closestVaults: closeConnections };
  };
  var removeFromArray = function(value, array) {
    var index = array.indexOf(value);
    if (index < 0) {
      return array;
    }
    return array.slice(0, index).concat(array.slice(++index));
  };
  var computeExpectedConnectionsOnStop = function(log, expConSnapshot) {
    var vaultLastSnapshot;
    var vaultIds = [];
    var diffsForUpdate = [];
    for (var i in expConSnapshot) {
      if (expConSnapshot[i] && expConSnapshot[i].vaultId !== log.valueOne) {
        vaultIds.push(expConSnapshot[i].vaultId);
      }
    }
    for (var index in expConSnapshot) {
      if (expConSnapshot[index]) {
        vaultLastSnapshot = expConSnapshot[index];
        if (log.valueOne !== vaultLastSnapshot.vaultId && vaultLastSnapshot.closestVaults.indexOf(log.valueOne) > -1) {
          diffsForUpdate.push(formatConnectionData(log.ts,
            vaultLastSnapshot.vaultId,
            partialSort.sort(removeFromArray(vaultLastSnapshot.vaultId, vaultIds), config.Constants.maxClosest,
              vaultLastSnapshot.vaultId)
          ));
        }
      }
    }
    return diffsForUpdate;
  };
  var computeExpectedConnections = function(log, expConSnapshot) {
    var vaultLastSnapshot;
    var vaultIds = [];
    var diffsForUpdate = [];
    var compute = function() {
      if (vaultLastSnapshot.closestVaults.length === config.Constants.maxClosest &&
        partialSort.closerToTarget(log.valueOne,
          vaultLastSnapshot.closestVaults[config.Constants.maxClosest - 1],
          vaultLastSnapshot.vaultId) > -1) {
        return;
      }
      vaultLastSnapshot.closestVaults.push(log.valueOne);
      diffsForUpdate.push(formatConnectionData(log.ts,
        vaultLastSnapshot.vaultId,
        partialSort.sort(vaultLastSnapshot.closestVaults, config.Constants.maxClosest, vaultLastSnapshot.vaultId)
      ));
    };
    for (var i in expConSnapshot) {
      if (expConSnapshot[i]) {
        vaultLastSnapshot = expConSnapshot[i];
        vaultIds.push(vaultLastSnapshot.vaultId);
        if (vaultLastSnapshot.closestVaults.indexOf(log.valueOne) === -1) {
          compute();
        }
      }
    }
    // update the started vaults expected connections
    diffsForUpdate.push(formatConnectionData(log.ts,
      log.valueOne,
      partialSort.sort(removeFromArray(log.valueOne, vaultIds), config.Constants.maxClosest, log.valueOne)
    ));
    return diffsForUpdate;
  };
  var getExpectedConnections = function(sessionId, activeIds, callback) {
    var collectionName = sessionId + COLLECTION_NAME_SUFFIX;
    var counter = activeIds.length;
    var monitor = {};
    var reduce = function(docs) {
      var reducedResults = [];
      for (var i = 0; i < docs.length && counter > 0; i++) {
        if (!monitor.hasOwnProperty(docs[i].vaultId)) {
          reducedResults.push(docs[i]);
          monitor[docs[i].vaultId] = true;
          counter--;
        }
      }
      return reducedResults;
    };
    dbCon.db.collection(collectionName, function(err, coll) {
      if (err) {
        callback(err);
        return;
      }
      coll.find({ vaultId: { $in: activeIds } }).sort([
        [ '_id', 'descending' ]
      ]).toArray(function(err, docs) {
        if (err) {
          callback(err);
          return;
        }
        callback(null, reduce(docs));
      });
    });
  };
  var saveExpectedConnection = function(sessionId, data, callback) {
    dbCon.db.collection(sessionId + COLLECTION_NAME_SUFFIX, function(err, coll) {
      coll.save(data, callback);
    });
  };
  var updateExpectedConnection = function(log, callback) {
    var diffs;
    var promise = new MongoosePromise();
    var mockHandler = function(err) {
      if (err) {
        console.log(err);
      }
    };
    if (callback) {
      promise.addBack(callback);
    }
    var onExpectedConnections = function(err, docs) {
      if (err || !docs) {
        promise.error(err ? err : 'Expected connections table - data fetch failed');
        return;
      }
      if (docs.length === 0 && log.actionId !== config.Constants.startActionId) {
        promise.error('Vault is not active');
        return;
      }
      // If the expected connection table is empty, then add the data
      if (docs.length === 0) {
        saveExpectedConnection(log.sessionId,
          formatConnectionData(log.ts, log.valueOne, []),
          new GeneralHandler(promise));
        return;
      }
      diffs = log.actionId === config.Constants.startActionId ?
        computeExpectedConnections(log, docs) : computeExpectedConnectionsOnStop(log, docs);
      for (var i = 0; i < diffs.length; i++) {
        saveExpectedConnection(log.sessionId,
          diffs[i],
          (i === diffs.length - 1) ? new GeneralHandler(promise) : mockHandler
        );
        socket.broadcastExpectedConnectionDiff(diffs);
      }
    };
    bridge.getActiveVaultsFullId(log.sessionId).then(function(activeValuts) {
      var activeIds = [];
      for (var index in activeValuts) {
        if (activeValuts[index]) {
          activeIds.push(activeValuts[index].vaultIdFull);
        }
      }
      getExpectedConnections(log.sessionId, activeIds, onExpectedConnections);
    });
    return promise;
  };
  var retrieveExpectedConnections = function(sessionId, callback) {
    var promise = new MongoosePromise();
    if (callback) {
      promise.addBack(callback);
    }
    bridge.getActiveVaultsFullId(sessionId).then(function(activeValuts) {
      var activeIds = [];
      for (var index in activeValuts) {
        if (activeValuts[index]) {
          activeIds.push(activeValuts[index].vaultIdFull);
        }
      }
      getExpectedConnections(sessionId, activeIds, function(err, data) {
        if (err) {
          promise.error(err);
          return;
        }
        promise.complete(data);
      });
    });
    return promise;
  };
  var dropCollection = function(sessionId) {
    dbCon.db.dropCollection(sessionId + COLLECTION_NAME_SUFFIX);
  };
  instance.dropCollection = dropCollection;
  instance.getExpectedConnections = retrieveExpectedConnections;
  instance.updateExpectedConnection = updateExpectedConnection;
  return instance;
};
