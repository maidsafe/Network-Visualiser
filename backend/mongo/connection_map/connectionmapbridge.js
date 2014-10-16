var ActualConnectionHandler = require('./ActualConnection');
var queueService = require('../../maidsafe/service/QueueService');
var ExpectedConnection = require('./ExpectedConnection');
var MongoBridge = function() {
  var instance = this;
  var dbCon;
  var actualConnection;
  var expectedConnection;
  instance.setDB = function(db) {
    dbCon = db;
    actualConnection = new ActualConnectionHandler(db);
    expectedConnection = new ExpectedConnection(db);
  };
  instance.addActualLog = function(log, callback) {
    return actualConnection.save(log, callback);
  };
  instance.updateExpected = function(log, promise) {
    // TODO handle and save the log
    return promise;
  };
  queueService.subscribe(function(msg, done) {
    expectedConnection.updateExpectedConnection(msg, function(err) {
      if (err) {
        console.log("%s - Update Expected Connection - %s ", new Date().toISOString(), err);
      }
      done();
    });
  });
  return instance;
};
exports.bridge = new MongoBridge();