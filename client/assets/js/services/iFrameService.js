(function () {
  'use strict';

  angular
    .module('lucidworksView.services.iFrame', [])
    .factory('iFrame', iFrame);


  function iFrame() {
    'ngInject';
    return {

    };
    function sendMessage(message) {
      console.log(message);
      window.parent.postMessage(message, 'http://localhost:90/'); //the '*' has to do with cross-domain messaging. leave it like it is for same-domain messaging.
    }
  }
})();
