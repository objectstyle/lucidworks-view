(function () {
  'use strict';

  angular
    .module('lucidworksView.components.facetPivotCards', ['lucidworksView.services.config'])
    .directive('facetPivotCards', facetPivotCards);

  function facetPivotCards() {
    'ngInject';
    console.log('facetPivotCards');
    var directive = {
      restrict: 'EA',
      templateUrl: 'assets/components/facetPivotCards/facetPivotCards.html',
      scope: true,
      controller: Controller,
      controllerAs: 'vm',
      bindToController: {
        isLoading: '='
      }
    };

    return directive;

  }

  function Controller(ConfigService, Orwell, LocalParamsService, $filter, FoundationApi) {
    'ngInject';
    var vm = this;
    var resultsObservable = Orwell.getObservable('queryResults');
    vm.facets = [];
    vm.facetNames = {};
    vm.facetLocalParams = {};
    vm.getLimitAmount = getLimitAmount;
    vm.toggleMore = toggleMore;
    activate();

    /**
     * Toggles the more button for the facet.
     */
    function toggleMore(){
      vm.more = !vm.more;
    }

    /**
     * Gets the amount to limit by
     * @return {integer|undefined} The amount to return or undefined.
     */
    function getLimitAmount(){
      if(vm.more){
        return undefined;
      }
      return 9;
    }

    function activate() {
      resultsObservable.addObserver(function (data) {
        // Exit early if there are no facets in the response.
        if (!data.hasOwnProperty('facet_counts') || !data['facet_counts'].hasOwnProperty('facet_pivot')) return;
        vm.facetLocalParams = LocalParamsService.getLocalParams(data.responseHeader.params);
        parseFacets(data);

        console.log(vm.facetCounts);
        /*resultFacetParse(data['facet_counts']['facet_pivot'], 'facet_pivot');

        function resultFacetParse(resultFacets, facetType){
          // Keep a list of facet names and only reflow facets based on changes to this list.
          var facetFields = Object.keys(resultFacets);
          if (!_.isEqual(vm.facetNames[facetType], facetFields)) {
            var oldFields = _.difference(vm.facetNames[facetType], facetFields);
            var newFields = _.difference(facetFields, vm.facetNames[facetType]);

            // Creating temp facet so that we don't have to change the model in Angular
            var tempFacets = _.clone(vm.facets);

            //removing old fields
            _.forEach(oldFields, function(field){
              _.remove(tempFacets, function(item){
                return item.name === field && item.type === facetType;
              });
            });

            // Adding new facet entries
            var newFacets = [];
            _.forEach(newFields, function(value){
              var facet = {
                name: value,
                type: facetType,
                autoOpen: true,
                label: getFieldsLabel(value)|| value, //ConfigService.getFieldLabels()[value], needed to edit FUSION_CONFIG to use
                tag: LocalParamsService.getLocalParamTag(vm.facetLocalParams['pivot'], value) || null,
                viewType: getFieldsViewType(value),
                pivot: true,
              };
              newFacets.push(facet);
            });

            // Updating the list till the end.
            tempFacets = _.concat(tempFacets, newFacets);
            vm.facets = tempFacets;
            // Updating the reflow deciding list.
            vm.facetNames[facetType] = facetFields;
          }
        }*/
      });
    }
/*
    function getFieldsLabel(name) {
      return ConfigService.config.field_display_labels[name];
    }

    function getFieldsViewType(value) {
      return ConfigService.config.field_view_type[value];
    }*/


    function parseFacets(data){
      // Exit early if there are no facets in the response.
      var facetFields;
      var facetCounts;
      var newFacets = [];
      var saveOldFacets = ConfigService.config.save_facets_after_filter;
      // Determine if facet exists.
      facetFields = data.facet_counts.facet_pivot;
      var facetName = Object.keys(facetFields)[0];
      // Transform an array of values in format [‘aaaa’, 1234,’bbbb’,2345] into an array of objects.
      facetCounts = pivotsToObjectArray(facetFields[facetName]);
      if (vm.facetCounts && vm.facetCounts.length && saveOldFacets) {
        newFacets = _.differenceBy(facetCounts, vm.facetCounts,  'title');
        vm.facetCounts = _.concat(vm.facetCounts, newFacets);
      } else {
        vm.facetCounts = facetCounts;
      }
    }

    function pivotsToObjectArray(obj) {
      return _.transform(obj, function (result, value, index) {
        result[index] = {
          title: value.value,
          amount: value.count,
          amountFormatted: $filter('humanizeNumberFormat')(value.count, 0),
          hash: FoundationApi.generateUuid(),
          //active: isFacetActive(value.field, value.value),
          field: value.field,
        };
        if (value.pivot && value.pivot.length) {
          result[index].pivots = pivotsToObjectArray(value.pivot);
        }
      });
    }
  }
})();
