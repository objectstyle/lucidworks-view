(function() {
  'use strict';
  angular
    .module('lucidworksView.controllers.cards', ['lucidworksView.services', 'angular-humanize'])
    .controller('CardsController', CardsController);

  function CardsController(Orwell, QueryService, ConfigService, $filter, $timeout, $log) {

    'ngInject';
    var cc = this; //eslint-disable-line
    var resultsObservable;
    var query;
    activate();
    function activate() {
      cc.isLoading = false;
      query = {
        q: '*',
        start: 0,
      };
      //Setting the query object... also populating the the view model
      cc.searchQuery = _.get(query,'q',ConfigService.config.default_query.q);
      // Use an observable to get the contents of a queryResults after it is updated.
      resultsObservable = Orwell.getObservable('queryResults');
      resultsObservable.addObserver(function(data) {
        // Locking the service to prevent multiple queries currently this only works for facet ranges (since it is very slow) but could add an ng-disabled to other areas and toggle on or off a disabled class
        startLoading();
        updateStatus();
        checkResultsType(data);
        updateStatus();
        endLoading();
      });

      // Force set the query object to change one digest cycle later
      // than the digest cycle of the initial load-rendering
      // The $timeout is needed or else the query to fusion is not made.
      $timeout(function(){
        QueryService.setQuery(query);
      });
    }

    function startLoading(){
      cc.isLoading = true;
    }


    function endLoading(){
      cc.isLoading = false;
    }

    function checkResultsType(data){
      if (data.hasOwnProperty('response')) {
        cc.numFound = data.response.numFound;
        cc.numFoundFormatted = $filter('humanizeNumberFormat')(cc.numFound, 0);
        cc.lastQuery = data.responseHeader.params.q;
        cc.showFacets = checkForFacets(data);
        // Make sure you check for all the supported facets before for empty-ness
        // before toggling the `showFacets` flag
      }
      else if(_.has(data, 'grouped')){
        cc.lastQuery = data.responseHeader.params.q;
        $log.debug(data.grouped, 'grouppeeeddd');
        var numFoundArray = [];
        _.each(data.grouped, function(group){
          numFoundArray.push(group.matches);
        });
        // For grouping, giving total number of documents found
        cc.numFound = _.sum(numFoundArray);
        cc.numFoundFormatted = $filter('humanizeNumberFormat')(cc.numFound, 0);
        cc.showFacets = checkForFacets(data);
      }
      else {
        cc.numFound = 0;
      }
    }

    // Checks from data if it has supported facet type.
    // TODO: Refactor this to make sure it detects facet types from available modules.
    function checkForFacets(data){
      if(_.has(data, 'facet_counts')){
        return !_.isEmpty(data.facet_counts.facet_pivot);
      }
      else{
        return false;
      }
    }

    function updateStatus(){
      var status = '';
      if(cc.numFound === 0){
        status = 'no-results';
        if(cc.lastQuery === ''){
          status = 'get-started';
        }
      } else {
        status = 'normal';
      }
      cc.status = status;
    }
  }
})();
