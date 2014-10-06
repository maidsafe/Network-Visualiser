/* global window:false */

window.SocketService = [
  '$rootScope', '$timeout', function($rootScope, $timeout) {
    $rootScope.realTime = true;
    $rootScope.sessionName = '';
    var socket = window.io.connect($rootScope.socketEndPoint);
    var logObserver;
    var signalObserver;
    var testnetStatusObserver;
    socket.on('log', function(data) {
      // jshint camelcase:false
      // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
      if ($rootScope.realTime && data.session_name === $rootScope.sessionName) {
        // jshint camelcase:true
        // jscs:enable requireCamelCaseOrUpperCaseIdentifiers
        if (logObserver) {
          $timeout(function() {
            logObserver(data);
          }, 1);
        }
      }
    });
    socket.on('signal', function(data) {
      if (signalObserver) {
        signalObserver(data);
      }
    });
    socket.on('testnet_status_update', function(data) {
      if (testnetStatusObserver) {
        testnetStatusObserver(data);
      }
    });
    this.start = function() {
      $rootScope.realTime = true;
    };
    this.stop = function() {
      $rootScope.realTime = false;
    };
    this.setLogListener = function(callback) {
      logObserver = callback;
    };
    this.setSignalListener = function(callback) {
      signalObserver = callback;
    };
    this.setTestnetStatusListener = function(callback) {
      testnetStatusObserver = callback;
    };
  }
];
