(function() {
  'use strict';

  angular
    .module('lucidworksView.components.sort', [])
    .directive('sort', sort);

  function sort() {
    'ngInject';
    var directive = {
      restrict: 'E',
      templateUrl: 'assets/components/sort/sort.html',
      scope: true,
      controller: Controller,
      controllerAs: 'vm',
      bindToController: {}
    };

    return directive;


  }

  function Controller($scope, ConfigService, QueryService) {
    'ngInject';
    var vm = this;
    vm.switchSort = switchSort;

    activate();

    /////////////

    function activate() {
      createSortList();

      $scope.$watch('vm.selectedSort', handleSelectedSortChange);
    }

    function createSortList(){
      var sortOptions = [];
      _.forEach(ConfigService.config.sort_fields, function(value){
        var label = ConfigService.config.sort_fields_labels[value];
        sortOptions.push({label: label, value: value, type: 'text', order: 'desc', active: false});
      });
      vm.sortOptions = sortOptions;
      vm.selectedSort = vm.sortOptions[0];
    }

    function handleSelectedSortChange(newValue, oldValue){
      if(newValue === oldValue) return;

      switchSort(newValue);
    }

    function switchSort(sort){
      var query = QueryService.getQueryObject();
      switch(sort.type) {
        case 'text':
          query.sort = sort.value+'%20'+sort.order;
          QueryService.setQuery(query);
          break;
        default:
          delete query.sort;
          QueryService.setQuery(query);
      }
    }
  }
})();
