var sq = require('simplequeue');
var queuePool = {};
var consumer;
var SessionQueue = function() {
  var msg;
  var queue = sq.createQueue();
  var STATE = {
    START: 0,
    STOP: 1
  };
  var currentState = STATE.STOP;
  var DoneCallback;
  var broadcast;
  var onReceived;
  broadcast = function() {
    msg = queue.getMessageSync();
    if (msg) {
      consumer(msg, new DoneCallback());
    }
    currentState = STATE.STOP;
  };
  DoneCallback = function() {
    var timerId;
    var timerDuration = 30000;
    var completed = false;
    var done = function() {
      clearTimeout(timerId);
      if (!completed) {
        completed = true;
        broadcast();
      }
    };
    timerId = setTimeout(function() {
      done();
      console.error('%s Queue was restarted forcefully - done callback was not completed in 2000ms',
        new Date().toISOString());
    }, timerDuration);
    return done;
  };
  onReceived = function() {
    if (currentState === STATE.STOP) {
      currentState = STATE.START;
      broadcast();
    }
  };
  this.pushToQueue  = function(log) {
    queue.putMessage(log);
    onReceived();
  };
};
exports.pushToQueue = function(log) {
  if (!queuePool[log.sessionId]) {
    queuePool[log.sessionId] = new SessionQueue();
  }
  queuePool[log.sessionId].pushToQueue(log);
};
exports.deleteQueue = function(sessionId) {
  delete queuePool[sessionId];
};
exports.subscribe = function(con) {
  consumer = con;
};
