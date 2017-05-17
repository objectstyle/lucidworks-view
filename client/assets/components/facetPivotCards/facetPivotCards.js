(function () {
  'use strict';

  angular
    .module('lucidworksView.components.facetPivotCards', ['lucidworksView.services.config'])
    .directive('facetPivotCards', facetPivotCards);

  function facetPivotCards() {
    'ngInject';
    return {
      restrict: 'EA',
      templateUrl: 'assets/components/facetPivotCards/facetPivotCards.html',
      scope: true,
      controller: Controller,
      controllerAs: 'vm',
      bindToController: {
        isLoading: '='
      }
    };

  }

  function Controller(ConfigService, QueryService, Orwell, LocalParamsService, $filter, FoundationApi) {
    'ngInject';
    var vm = this;
    var resultsObservable = Orwell.getObservable('queryResults');
    vm.facets = [];
    vm.facetNames = {};
    vm.facetLocalParams = {};
    vm.getLimitAmount = getLimitAmount;
    vm.toggleMore = toggleMore;
    vm.toggleFacet = toggleFacet;

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
      return 100;
    }

    function activate() {
      resultsObservable.addObserver(function (data) {
        // Exit early if there are no facets in the response.
        if (!data.hasOwnProperty('facet_counts') || !data['facet_counts'].hasOwnProperty('facet_pivot')) return;
        vm.facetLocalParams = LocalParamsService.getLocalParams(data.responseHeader.params);
        parseFacets(data);
      });
    }

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

    /**
     * Toggles a facet on or off depending on it's current state.
     * @param  {object} facet The facet object
     */
    function toggleFacet(facet) {
      var key;
      if (vm.facetName === 'Category2,Category3') {
        key = facet.field;
      } else {
        key = vm.facetName;
      }
      var query = QueryService.getQueryObject();

      // CASE: fq exists.
      if(!query.hasOwnProperty('fq')){
        query = addQueryFacet(query, key, facet.title);
      } else {
        // Remove the key object from the query.
        // We will re-add later if we need to.
        var keyArr = _.remove(query.fq, function(value){
          return checkFacetExists(value, key);
        });

        // CASE: facet key exists in query.
        if(keyArr.length > 0) {
          var keyObj = keyArr[0];
          var removed = _.remove(keyObj.values, function(value){return value === facet.title;});
          // CASE: value didn't previously exist add to values.
          if(removed.length === 0){
            if(!keyObj.hasOwnProperty('values')){
              keyObj.values = [];
            }
            keyObj.values.push(facet.title);
          }
          // CASE: there are still values in facet attach keyobject back to query.
          if(keyObj.values.length > 0){
            query.fq.push(keyObj);
          }
          // Delete 'fq' if it is now empty.
          if(query.fq.length === 0){
            delete query.fq;
          }
        } else { // CASE: Facet key doesnt exist ADD key AND VALUE.
          query = addQueryFacet(query, key, facet.title);
        }

      }
      // Set the query and trigger the refresh.
      updateFacetQuery(query);
    }

  }
})();
