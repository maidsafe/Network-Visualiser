exports.Request = function() {
  this.body = null;
};
exports.Response = function(done, assert) {
  var respCode;
  var respMsg;
  this.status = function(status) {
    respCode = status;
  };
  this.send = function(status, msg) {
    if (status && msg) {
      respCode = status;
      respMsg = msg;
    } else {
      respCode = 200;
      respMsg = status;
    }
    if (assert) {
      try {
        assert(respCode, respMsg);
      } catch (err) {
        done(err);
      }
    }
  };
};
