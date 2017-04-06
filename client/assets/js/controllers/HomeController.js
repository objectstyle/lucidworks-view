(function() {
  'use strict';
  angular
    .module('lucidworksView.controllers.home', ['lucidworksView.services', 'angular-humanize'])
    .controller('HomeController', HomeController);

  function HomeController($window, $filter, $timeout, $rootScope, ConfigService, QueryService, URLService, PaginateService, Orwell, AuthService, _, $log) {

    'ngInject';
    var hc = this; //eslint-disable-line
    var resultsObservable;
    var query;
    var sorting;

    hc.filter = {
      modifiedDate : null,

      changeModifiedDateFilter: function (query, filter) {
        if (!query.fq) {
          query.fq = [];
        }

        if (!filter) {
          return; // TODO log error
        }

        if (this.modifiedDate === null) {
          query.fq.push(filter);

        } else {
          var filterIndex = query.fq.indexOf(filter);
          if (filterIndex == -1) {
            query.fq.splice(filterIndex, 1);
          }

          if (this.modifiedDate === filter) {
            query.fq.push(filter);
          }
        }

        if (query.fq.length == 0) {
          delete query.fq;
        }
      }
    };

    hc.setActiveTab = setActiveTab;
    hc.setShowingRows = setShowingRows;
    hc.formQuery = formQuery;
    hc.resetSearch = resetSearch;
    hc.setActive = setActive;
    hc.setDate = setDate;

    hc.dateRanges = [
      { name: 'Today', filter: 'fetchedDate_dt:[NOW-1DAY TO NOW]'},
      { name: 'Past week', filter: 'fetchedDate_dt:[NOW-7DAYS TO NOW]'},
      { name: 'Past month', filter: 'fetchedDate_dt:[NOW-1MONTH TO NOW]'},
      { name: 'Past 6 month', filter: 'fetchedDate_dt:[NOW-3MONTHS TO NOW]'}
    ];

    hc.dateRange = {
      from: undefined,
      to: undefined,
    };

    hc.searchQuery = ConfigService.config.default_query.q;
    activate();

    ////////////////

    /**
     * Initializes a search from the URL object
     */
    function activate() {
      hc.search = doSearch;
      hc.logout = logout;
      hc.appName = ConfigService.config.search_app_title;
      hc.logoLocation = ConfigService.config.logo_location;
      hc.status = 'loading';
      hc.lastQuery = '';
      hc.sorting = {};
      hc.grouped = false;
      hc.isLoading = false;
      hc.activeTab = 2;
      hc.getTotalPages = PaginateService.getTotalResultRows;
      hc.searchAssistant = true;

      query = URLService.getQueryFromUrl();
      //Setting the query object... also populating the the view model
      hc.searchQuery = _.get(query,'q',ConfigService.config.default_query.q);
      // Use an observable to get the contents of a queryResults after it is updated.
      resultsObservable = Orwell.getObservable('queryResults');
      resultsObservable.addObserver(function(data) {
        // Locking the service to prevent multiple queries currently this only works for facet ranges (since it is very slow) but could add an ng-disabled to other areas and toggle on or off a disabled class
        startLoading();
        // updateStatus();
        checkResultsType(data);
        updateStatus();
        // Initializing sorting
        sorting = hc.sorting;
        sorting.switchSort = switchSort;
        createSortList();
        endLoading();
        hc.activePage = getActivePage();
        setShowingRows();
      });

      // Force set the query object to change one digest cycle later
      // than the digest cycle of the initial load-rendering
      // The $timeout is needed or else the query to fusion is not made.
      $timeout(function(){
        QueryService.setQuery(query);
      });
    }

    function startLoading(){
      hc.isLoading = true;
    }


    function endLoading(){
      hc.isLoading = false;
    }

    function checkResultsType(data){
      if (data.hasOwnProperty('response')) {
        hc.numFound = data.response.numFound;
        hc.numFoundFormatted = $filter('humanizeNumberFormat')(hc.numFound, 0);
        hc.lastQuery = data.responseHeader.params.q;
        hc.showFacets = checkForFacets(data);
        // Make sure you check for all the supported facets before for empty-ness
        // before toggling the `showFacets` flag
      }
      else if(_.has(data, 'grouped')){
        hc.lastQuery = data.responseHeader.params.q;
        $log.debug(data.grouped, 'grouppeeeddd');
        var numFoundArray = [];
        _.each(data.grouped, function(group){
          numFoundArray.push(group.matches);
        });
        // For grouping, giving total number of documents found
        hc.numFound = _.sum(numFoundArray);
        hc.numFoundFormatted = $filter('humanizeNumberFormat')(hc.numFound, 0);
        hc.showFacets = checkForFacets(data);
      }
      else {
        hc.numFound = 0;
      }
    }

    // Checks from data if it has supported facet type.
    // TODO: Refactor this to make sure it detects facet types from available modules.
    function checkForFacets(data){
      if(_.has(data, 'facet_counts')){
        return (!_.isEmpty(data.facet_counts.facet_fields)) || (!_.isEmpty(data.facet_counts.facet_ranges));
      }
      else{
        return false;
      }
    }

    function updateStatus(){
      var status = '';
      if(hc.numFound === 0){
        status = 'no-results';
        if(hc.lastQuery === ''){
          status = 'get-started';
        }
      } else {
        status = 'normal';
      }
      hc.status = status;
    }



    /**
     * Initializes a new search.
     */
    function doSearch() {
      query = {
        q: hc.searchQuery,
        start: 0,
        // TODO better solution for turning off fq on a new query
        fq: []
      };

      QueryService.setQuery(query);
    }

    /**
     * Creates a sorting list from ConfigService
     */
    function createSortList(){
      var sortOptions = [{label:'default sort', type:'default', order:'', active: true}];
      _.forEach(ConfigService.config.sort_fields, function(value){
        sortOptions.push({label: value, type: 'text', order: 'asc', active: false});
        sortOptions.push({label: value, type: 'text', order: 'desc', active: false});
      });
      sorting.sortOptions = sortOptions;
      sorting.selectedSort = sorting.sortOptions[0];
    }

    /**
     * Switches sort parameter in the page
     */
    function switchSort(sort){
      sorting.selectedSort = sort;
      var query = QueryService.getQueryObject();
      switch(sort.type) {
        case 'text':
          query.sort = sort.label+' '+sort.order;
          QueryService.setQuery(query);
          break;
        default:
          delete query.sort;
          QueryService.setQuery(query);
      }
    }

    /**
     * Logs a user out of a session.
     */
    function logout(){
      AuthService.destroySession();
    }

    function setActiveTab(num) {
      hc.activeTab = num;
    }

    function getActivePage() {
      return PaginateService.getCurrentPage() + 1;
    }

    function setShowingRows() {
      var start;
      if (hc.activePage == 1) {
        start = hc.activePage;
      } else {
        start = (hc.activePage - 1) * PaginateService.getRowsPerPage() + 1;
      }
      hc.showingRows =  start + '-' + (hc.activePage * PaginateService.getRowsPerPage());
    }

    function formQuery() {
      var advancedQuery = '';
      var allWords = '';
      var anyWords = '';
      var noWords = '';
      if (hc.advanced.allWords && hc.advanced.allWords.length> 0) {
        var allWordsArr = hc.advanced.allWords.split(' ');
        for (var i = 0; i < allWordsArr.length; i++) {
          allWords += allWordsArr[i];
          if (i !== allWordsArr.length - 1) {
            allWords += ' AND ';
          }
        }
      }
      if (hc.advanced.anyWords && hc.advanced.anyWords.length> 0) {
        var anyWordsArr = hc.advanced.anyWords.split(' ');
        for (var j = 0; j < anyWordsArr.length; j++) {
          if (j === 0) {
            anyWords += '(';
          }
          anyWords += anyWordsArr[j];
          if (j !== anyWordsArr.length - 1) {
            anyWords += ' OR ';
          } else {
            anyWords += ')';
          }
        }
      }
      if (hc.advanced.exactPhrase && hc.advanced.exactPhrase.length> 0) {
        var exactPhrase = '"' + hc.advanced.exactPhrase + '"';
      }

      if (hc.advanced.noWords && hc.advanced.noWords.length> 0) {
        var noWordsArr = hc.advanced.noWords.split(' ');
        for (var k = 0; k < noWordsArr.length; k++) {
          noWords += ' not ' + noWordsArr[k];
        }
      }
      advancedQuery += allWords + ' AND ' + anyWords + ' AND ' + exactPhrase + noWords;
      hc.searchQuery = advancedQuery;
    }

    function resetSearch() {
      hc.searchQuery = '*';
    }

    $window.addEventListener('message', receiveMessage, false);

    function receiveMessage(event){
      var message = event.data;
      if (message.type == 'search') {
        hc.searchQuery = message.value;
        $rootScope.$broadcast('searchChangeMessage', message.value);
        doSearch();
      } else {
        $rootScope.$broadcast('facetChangeMessage', message);
      }
    }

    function setActiveDateRange (id) {
      hc.activeRange = id;
    }

    function setActive(type) {
      hc.activeDateInput = type;
    }
    function setDate() {
      hc.dateRange[hc.activeDateInput] = hc.date;
    }

    hc.addFilter = function (f) {
      console.log("addFilter", f);
      var query = QueryService.getQueryObject();

      hc.filter.changeModifiedDateFilter(query, f);

      query.start = 0;
      QueryService.setQuery(query);
    }
  }
})();
