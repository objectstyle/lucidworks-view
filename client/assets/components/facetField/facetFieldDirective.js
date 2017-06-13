(function() {
  'use strict';

  angular
    .module('lucidworksView.components.facetField')
    .directive('facetField', facetField);

  function facetField() {
    'ngInject';
    return {
      restrict: 'EA',
      templateUrl: 'assets/components/facetField/facetField.html',
      scope: true,
      controller: Controller,
      controllerAs: 'vm',
      bindToController: {
        facetName: '@facetName',
        facetViewType: '@facetViewType',
        facetAutoOpen: '@facetAutoOpen',
        facetTag: '@facetTag',
        facetPivot: '@facetPivot',
        showFullList: '@showFullList',
      }
    };
  }

  function Controller($scope, ConfigService, QueryService, Orwell, FoundationApi, $filter, $log) {
    'ngInject';
    var vm = this;
    vm.facetCounts = [];
    vm.updateQueryFilters = updateQueryFilters;
    vm.toggleFacetSelect = toggleFacetSelect;
    vm.toggleMore = toggleMore;
    vm.getLimitAmount = getLimitAmount;
    vm.setSelectedOption = setSelectedOption;
    vm.updateFacetActive = updateFacetActive;
    vm.toggleFacetPivots = toggleFacetPivots;
    vm.togglePivotFacet = togglePivotFacet;
    vm.more = false;
    vm.clearAppliedFilters = clearAppliedFilters;
    var resultsObservable = Orwell.getObservable('queryResults');
    vm.selectedOption = 'All Categories';
    vm.activeFacets = {};
    activate();
    vm.listAmountLimit = 5;

    //////////////

    /**
     * Activate the controller.
     */
    function activate() {
      // Add observer to update data when we get results back.
      resultsObservable.addObserver(parseFacets);
      // initialize the facets.
      parseFacets(resultsObservable.getContent());

      if (vm.facetViewType == 'select') {
        setSelectedOption();
      }
    }

    function updateFacetActive() {
      vm.facetCounts.forEach(function(facet) {
        facet.active = facet.title == vm.selectedOption;
      });
    }

    function setSelectedOption(facetName) {
      if (facetName) {
        vm.selectedOption = facetName;
      } else {
        _.forEach(vm.facetCounts, function(facet) {
          if (facet.active) {
            vm.selectedOption = facet.title;
          }
        });
      }
    }

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
      return vm.listAmountLimit;
    }

    /**
     * Parses the facets from an observable into an array of facets.
     * @param  {object} data The data from the observable.
     */
    function parseFacets(data){
      // Exit early if there are no facets in the response.
      if (!data.hasOwnProperty('facet_counts')) return;
      var facetFields;
      var facetCounts;
      var newFacets = [];
      // Determine if facet exists.
      if (vm.facetPivot === 'true') {
        facetFields = data.facet_counts.facet_pivot;
        if (facetFields.hasOwnProperty(vm.facetName)) {
          // Transform an array of values in format [‘aaaa’, 1234,’bbbb’,2345] into an array of objects.
          facetCounts = pivotsToObjectArray(facetFields[vm.facetName]);
          if (vm.facetCounts && vm.facetCounts.length && vm.showFullList) {
            newFacets = _.differenceBy(facetCounts, vm.facetCounts,  'title');
            vm.facetCounts = _.concat(vm.facetCounts, newFacets);
          } else {
            vm.facetCounts = facetCounts;
          }
        }
      } else {
        facetFields = data.facet_counts.facet_fields;
        if (facetFields.hasOwnProperty(vm.facetName)) {
          // Transform an array of values in format [‘aaaa’, 1234,’bbbb’,2345] into an array of objects.
          facetCounts = arrayToObjectArray(facetFields[vm.facetName]);
          /*if (vm.facetCounts && vm.facetCounts.length && vm.showFullList) {
            var oldFacets = _.differenceBy(vm.facetCounts, facetCounts, 'title');
          }
          vm.facetCounts = _.concat(facetCounts, oldFacets);*/
          if (vm.facetCounts && vm.facetCounts.length && vm.showFullList) {
            newFacets = _.differenceBy(facetCounts, vm.facetCounts,  'title');
            vm.facetCounts = _.concat(vm.facetCounts, newFacets);
          } else {
            vm.facetCounts = facetCounts;
          }
        }

        // Set inital active state
        var active = true;
        // If we have autoOpen set active to this state.
        if (angular.isDefined(vm.facetAutoOpen) && vm.facetAutoOpen === 'false') {
          active = false;
        }
        vm.active = active;
      }
    }

    /**
     * Turn a flat array into an object array.
     *
     * Transforms an array of values in format ['aaaa', 1234,'bbbb',2345] into
     * an array of objects.
     * [{title:'aaaa', amount:1234, hash: zf-hs-njkfhdsle},
     *  {title:'bbbb', amount:2345, hash: zf-hs-jkewrkljn}]
     *
     * @param  {array} arr The array to transform
     * @return {array}     An array of objects
     */
    function arrayToObjectArray(arr) {
      return _.transform(arr, function (result, value, index) {
        if (index % 2 === 1) {
          result[result.length - 1] = {
            title: result[result.length - 1],
            amount: value,
            amountFormatted: $filter('humanizeNumberFormat')(value, 0),
            hash: FoundationApi.generateUuid(),
            active: isFacetActive(vm.facetName, result[result.length - 1])
          };
        } else {
          result.push(value);
        }
      });
    }

    function pivotsToObjectArray(obj) {
      return _.transform(obj, function (result, value, index) {
        result[index] = {
          title: value.value,
          amount: value.count,
          amountFormatted: $filter('humanizeNumberFormat')(value.count, 0),
          hash: FoundationApi.generateUuid(),
          active: isFacetActive(value.field, value.value),
          field: value.field,
          pivotFacet: true,
        };
        if (value.pivot && value.pivot.length) {
          result[index].pivots = pivotsToObjectArray(value.pivot);
        }
      });
    }

    function togglePivotFacet(facet, pivot) {
      var query = QueryService.getQueryObject();

      if (!facet.active) {
        query = updateQueryFilters(facet, query);
        facet.active = true;
      }
      query = updateQueryFilters(pivot, query);

      // Set the query and trigger the refresh.
      updateFacetQuery(query);
    }

    /**
     * Toggles a facet on or off depending on it's current state.
     * @param  {object} facet The facet object
     */
    function updateQueryFilters(facet, query) {
      var key;
      if (facet.pivotFacet == true) {
        key = facet.field;
      } else {
        key = vm.facetName;
      }

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

      return query;
    }

    /**
     * Sets the facet query and sets start row to beginning.
     * @param  {object} query The query object.
     */
    function updateFacetQuery(query){
      query.start = 0;
      QueryService.setQuery(query);
    }

    function toggleFacetSelect() {
      var facetTitle = vm.selectedOption;
      var query = QueryService.getQueryObject();
      var key = vm.facetName;
      if (query.hasOwnProperty('fq')) {
        _.remove(query.fq, function(value){
          return checkFacetExists(value, key);
        });
      }

      if (facetTitle !== 'All Categories') {
        query = addQueryFacet(query, key, facetTitle);
      }
      // Set the query and trigger the refresh.
      updateFacetQuery(query);
      setSelectedOption();
    }

    /**
     * Determine if a facet is currently active.
     * @param  {string}  key   The key for the facet
     * @param  {object}  value the facet
     * @return {Boolean}       [description]
     */
    function isFacetActive(key, value){
      var query = QueryService.getQueryObject();
      if(!query.hasOwnProperty('fq')){
        return false;
      }
      var keyObj = _.find(query.fq, function(val){
        return checkFacetExists(val, key);
      });
      if(_.isEmpty(keyObj)){
        return false;
      }
      if(_.isEmpty(_.find(keyObj.values, function(data){return data === value;}))){
        return false;
      }
      return true;
    }

    function addQueryFacet(query, key, title){
      if(!query.hasOwnProperty('fq')){
        query.fq = [];
      }
      var keyObj = {
        key: key,
        values: [title],
        transformer: 'fq:field',
        tag: vm.facetTag
      };
      if(keyObj.tag){
        //Set these properties if the facet has localParams
        //concat the localParams with the key of the facet
        keyObj.key = '{!tag=' + keyObj.tag + '}' + key;
        keyObj.transformer = 'localParams';
        var existingMultiSelectFQ = checkIfMultiSelectFQExists(query.fq, keyObj.key);
        if(existingMultiSelectFQ){
          //If the facet exists, the new filter values are pushed into the same facet. A new facet object is not added into the query.
          existingMultiSelectFQ.values.push(title);
          return query;
        }
      }
      query.fq.push(keyObj);
      $log.debug('final query', query);
      return query;
    }

    /**
     * Return the facet with localParams if it exists in the query object
     * @param  {object} fq  query object
     * @param  {string} key the key name of the query facet
     * @return {object}     the facet with localParams found in the query object
     */
    function checkIfMultiSelectFQExists(fq, key){
      return _.find(fq, function(value){
        return value.key === key && value.tag;
      });
    }

    /**
     * Check if the facet key and transformer match with the passed in key and the appropriate key syntax
     * @param  {object}  val The facet object
     * @param  {string}  key The name of the facet
     * @return {Boolean}
     */
    function checkFacetExists(val, key){
      //CASE 1: facet is a field facet without local params
      //CASE 2: facet is a field facet with local params. The local param is present in the key of the facet. Eg: {!tag=param}keyName
      return (val.key === key && val.transformer === 'fq:field') ||
       (val.key === ('{!tag='+vm.facetTag+'}' + key) && val.transformer === 'localParams');
    }

    /**
     * remove all filters applied on a facet
     * @param  {object} e event object to stopPropagation of click
     */
    function clearAppliedFilters(e){
      e.stopPropagation();
      var query = QueryService.getQueryObject();
      if(query.hasOwnProperty('fq')){
        var clearedFilter = _.remove(query.fq, function(value){
          return checkFacetExists(value, vm.facetName);
        });
        if(clearedFilter.length){
          updateFacetQuery(query);
        }
      }
    }

    function toggleFacetSelection(facet) {
      if (!facet.active && facet.pivots && facet.pivots.length) {
        _.forEach(facet.pivots, function (pivot) {
          if (pivot.active == true) {
            pivot.active = false;
          }
        });
      }
    }

    function uncheckAll() {
      _.forEach(vm.facetCounts, function (facet) {
        facet.active = false;
        toggleFacetSelection(facet);
      });
    }

    function toggleFacetPivots(facet) {
      facet.show = !facet.show;
      if (facet.pivot) {
        _.forEach(facet.pivot, function (f) {
          f.show = !f.show;
        });
      }
    }

    $scope.$on('facetChangeMessage', function (event, message) {
      if (message.type == vm.facetName) {
        vm.selectedOption = message.value;
        updateFacetActive();
        toggleFacetSelect();
      }
    });

    $scope.$on('facetFiltersReset', uncheckAll);
  }
})();
