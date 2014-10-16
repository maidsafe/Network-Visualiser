var sq = require('simplequeue');
var queue = sq.createQueue();
var msg;
var STATE = {
  START: 0,
  STOP: 1
};
var currentState = STATE.STOP;
var consumer;
var onReceived = function() {
  if (currentState === STATE.STOP) {
    currentState = STATE.START;
    broadcast();
  }
};
var broadcast = function() {
  msg = queue.getMessageSync();
  if (msg) {
    consumer(msg, function() {
      broadcast();
    });
  }
  currentState = STATE.STOP;
};
exports.add = function(obj) {
  queue.putMessage(obj);
  onReceived();
};
exports.subscribe = function(con) {
  consumer = con;
};
