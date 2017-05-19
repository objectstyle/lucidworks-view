(function () {
  'use strict';

  angular
    .module('lucidworksView.components.searchbox')
    .directive('searchBox', searchbox);

  function searchbox() {
    'ngInject';
    return {
      restrict: 'EA',
      controller: Controller,
      templateUrl: 'assets/components/searchBox/searchBox.html',
      scope: true,
      controllerAs: 'ta',
      bindToController: {
        onSelect:'&',
        query: '='
      },
      require: '^form'
    };
  }

  function Controller($element, $scope, $log, $q, $sce, $timeout, ConfigService, SearchBoxDataService) {
    'ngInject';
    var ta = this;

    ta.checkKeyPress = checkKeyPress;
    ta.toggleSearchBar = toggleSearchBar;
    ta.typeaheadField = ConfigService.getTypeaheadField();
    ta.initialValue = _.isArray(ta.query)?ta.query[0]:ta.query;
    ta.noResults = undefined;
    ta.advanced = {};
    ta.showBar = false;

    //need to get hold of the element to be able to manually close the suggestions div
    var massAutocompleteElem = $element.find('div')[0];

    //mass-autocomplete config
    ta.dirty = {};

    ta.autocomplete_options = {
      suggest: doTypeaheadSearch,
      on_error: showNoResults,
      on_select: selectedSomething,
    };

    activate();

    function activate() {
      if (ta.query == '*') {
        ta.dirty.value = '';
      } else {
        ta.dirty.value = ta.query;
      }
    }

    function checkKeyPress($event) {
      ta.query = ta.dirty.value;
      if ($event.keyCode === 13) {
        closeSuggester();
      }
    }

    function closeSuggester() {
      var massAutoElemScope = angular.element(massAutocompleteElem).isolateScope();
      $timeout(function() {
        if(massAutoElemScope.show_autocomplete) {
          massAutoElemScope.show_autocomplete = false;
        }
      },200);
    }

    function doTypeaheadSearch(term) {
      var deferred = $q.defer();
      ta.noResults = false;
      // set this here
      setQuery(term);
      SearchBoxDataService
        .getTypeaheadResults(term)
        .then(function (resp) {
          if(resp.hasOwnProperty('terms') && resp.terms.body_t.length) {
            deferred.resolve(suggest_results(resp.terms.body_t,term));
          } else {
            return deferred.reject('No suggestions for '+term);
          }
        })
        .catch(function (error) {
          //TODO better error reporting
          $log.error('typeahead search error:',error);
          // currently don't want to surface these in the UI
          // return deferred.reject('An error occurred: '+error);
        });

      return deferred.promise;
    }


    function highlight(str, term) {
      var highlight_regex = new RegExp('('+_.escapeRegExp(term)+')', 'gi');
      return str.replace(highlight_regex, '<span class="highlight">$1</span>');
    }

    function selectedSomething(object) {
      if (object) {
        var newValue = _.isArray(object.value) ? object.value[0]:object.value;
        setQuery(newValue);
        $timeout(ta.onSelect);
      }
    }

    function setQuery (query) {
      ta.query = query;
    }

    function showNoResults(message) {
      ta.noResults = true;
      ta.noResultsMessage = message;
    }

    function suggest_results(responseDocs,term) {
      if (term.length >= 2) {
        var results = [];
        _.forEach(responseDocs,function(doc, key) {
          if (key % 2 == 0) {
            results.push({label:$sce.trustAsHtml('<div class="title-wrapper" title="'+doc+'">'+highlight(doc, term)+'</div>'),value:doc});
          }
        });
        return results;
      }
    }

    function toggleSearchBar() {
      $timeout(function() {
        ta.showBar = !ta.showBar;
      },100);
    }


    $scope.$on('searchChangeMessage', function (event, message) {
      if (message == '*') {
        ta.dirty.value = '';
      } else {
        ta.dirty.value = message;
      }
    });
  }
})();
