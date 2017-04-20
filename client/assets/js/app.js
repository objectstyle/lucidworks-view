(function () {
  'use strict';

  angular
    .module('lucidworksView', [
      'ui.router',
      'ngAnimate',
      'ngSanitize',
      'mp.datePicker',

      // Foundation
      'foundation',
      'foundation.dynamicRouting',
      'foundation.dynamicRouting.animations',

      // Libraries
      'ngOrwell',
      'rison',
      'MassAutoComplete',

      // Fusion Seed App
      'lucidworksView.components',
      'lucidworksView.services',
      'lucidworksView.controllers',
    ])
    .constant('_', window._) //eslint-disable-line
    .config(config)
    .run(run);

  /**
   * Main app config
   *
   * @param  {Provider} $urlRouterProvider    Provider for url
   * @param  {Provider} $httpProvider         Provider for http
   * @param  {Provider} $locationProvider     Provider for location
   * @param  {Provider} ApiBaseProvider       Provider for ApiBase
   * @param  {Provider} ConfigServiceProvider Provider for ConfigService
   */
  function config($urlRouterProvider, $httpProvider, $locationProvider, ApiBaseProvider,
    ConfigServiceProvider, $windowProvider, $stateProvider) {
    'ngInject';
    $urlRouterProvider.otherwise('/search');
    $httpProvider.interceptors.push('AuthInterceptor');
    $httpProvider.defaults['withCredentials'] = true; //eslint-disable-line

    $locationProvider.html5Mode({
      enabled: true,
      requireBase: false
    });

    $stateProvider
      .state('cards', {
        url: '/cards',
        templateUrl: 'templates/cards.html',
        controllerAs: 'hc',
        controller: 'CardsController',
      });

    $locationProvider.hashPrefix('!');
    // If using a proxy use the same url.
    if (ConfigServiceProvider.config.use_proxy) {
      var $window = $windowProvider.$get();
      ApiBaseProvider.setEndpoint($window.location.protocol + '//' + $window.location.host +
        '/');
    } else {
      ApiBaseProvider.setEndpoint(ConfigServiceProvider.getFusionUrl());
    }
  }

  /**
   * Main app run time
   *
   * @param  {Service} $document     Document service
   */
  function run($document, $rootScope, ConfigService) {
    'ngInject';
    $rootScope.title = ConfigService.config.search_app_title;
  }
})();
