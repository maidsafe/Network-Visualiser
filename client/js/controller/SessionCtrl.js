var SessionCtrl = [
  '$scope', '$http', function($scope, $http) {
    $scope.sessionId = '';
    $scope.sessionName = '';
    $scope.activeSessions = [];

    $http.get('/currentActiveSessions').then(function(result) {
      $scope.activeSessions = result.data;
    });

    $scope.createSession = function() {
      if (!$scope.createSessionForm.focus.$valid)
        return;
      console.log("--> Submitting form with Name: " + $scope.sessionName);
      $http({
        url: ("/createSession"),
        method: "POST",
        data: { 'session_name': $scope.sessionName },
        headers: {'Content-Type': 'application/json'}
      }).success(function(data) {
        $scope.sessionId = data;
      }).error(function(err) {
        console.log(err);
      });
    };
    $scope.validateField = function(ngModelController) {
      if (ngModelController.$pristine)
        return "";
      return ngModelController.$valid ? "fieldValid" : "fieldInvalid";
    };
  }
];