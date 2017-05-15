(function () {
  'use strict';

  angular
    .module('lucidworksView.services.auth', ['lucidworksView.services.apiBase',
      'lucidworksView.services.config'
    ])
    .factory('AuthService', AuthService);

  function AuthService($window, $q, $log, $http, $rootScope, ApiBase, ConfigService) {
    'ngInject';
    var config = ConfigService.config;
    var realmName = config.connection_realm;

    return {
      createSession: createSession,
      getSession: getSession,
      destroySession: destroySession,
      createSessionSaml: createSessionSaml,
    };

    //////////////


    function createSession(username, password) {
      var deferred = $q.defer();
      $http
        .post(ApiBase.getEndpoint() + 'api/session?realmName=' + realmName, {
          username: username,
          password: password
        })
        .then(function (resp) {
          deferred.resolve(resp);
        }, function (err) {
          deferred.reject(err);
        });

      return deferred.promise;
    }

    function createSessionSaml() {
      $window.location = ApiBase.getEndpoint() + 'api/saml/' + config.connection_realm_name;
    }

    function getSession() {
      var deferred = $q.defer();
      $http
        .get(ApiBase.getEndpoint() + 'api/session?realmName=' + realmName)
        .then(function (resp) {
          deferred.resolve(resp);
        }, function (err) {
          deferred.reject(err);
        });
      return deferred.promise;
    }

    function destroySession() {
      var deferred = $q.defer();
      $http
        .delete(ApiBase.getEndpoint() + 'api/session?realmName=' + realmName)
        .then(function (resp) {
          deferred.resolve(resp);
        });

      return deferred.promise;
    }
  }
})();
