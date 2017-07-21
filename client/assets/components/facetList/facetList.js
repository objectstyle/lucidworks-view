(function () {
  'use strict';

  angular
    .module('lucidworksView.components.facetList', ['lucidworksView.services.config'])
    .directive('facetList', facetList);

  function facetList() {
    'ngInject';
    var directive = {
      restrict: 'EA',
      templateUrl: 'assets/components/facetList/facetList.html',
      scope: true,
      controller: Controller,
      controllerAs: 'vm',
      bindToController: {
        isLoading: '='
      }
    };

    return directive;

  }

  function Controller(ConfigService, Orwell, LocalParamsService, $filter) {
    'ngInject';
    var vm = this;
    var resultsObservable = Orwell.getObservable('queryResults');
    vm.facets = {
      ungrouped: [],
      groups: [],
    };
    vm.facetNames = {};
    vm.facetLocalParams = {};
    vm.defaultRangeFacetFormatter = defaultRangeFacetFormatter;
    activate();

    /**
     * Try to parse the range facets automatically by looking to see if they are dates.  Callers
     * of the directive may provider their own formatter by specifying the `formatting-handler` attribute
     *  on the directive.
     * @param toFormat
     * @returns The formatted result.  If it is a date, it will apply the 'mediumDate' format, else it will return the value as is
     */
    function defaultRangeFacetFormatter(toFormat){
      //check to see if it looks like a date first, since Solr will likely send back as an ISO date
      //2016-02-14T00:00:00Z - 2016-03-14T00:00:00Z
      var result;
      if (angular.isFunction(toFormat.indexOf) && toFormat.indexOf('Z') != -1 && toFormat.indexOf('T') != -1){
        result = Date.parse(toFormat);
        //most range facet displays don't need time info, so just do angular filter by default to day/month/year
        result = $filter('date')(result, 'mediumDate');
      } else {
        result = toFormat;
      }
      return result;
    }

    function activate() {
      resultsObservable.addObserver(function (data) {
        // Exit early if there are no facets in the response.
        if (!data.hasOwnProperty('facet_counts')) return;
        vm.facetLocalParams = LocalParamsService.getLocalParams(data.responseHeader.params);

        var facetsConfig = ConfigService.config.facets;
        _.forEach(facetsConfig, function(facet) {
          if (data.facet_counts[facet.facetType]) {
            var facetData = data.facet_counts[facet.facetType][facet.name];

            if (shouldBeUpdated(facetData, facet)) {
              clearFacet(facet);
              var newFacet = {
                name: facet.name,
                type: facet.facetType,
                autoOpen: true,
                label: facet.label,
                tag: LocalParamsService.getLocalParamTag(vm.facetLocalParams[retrieveFacetType(facet.facetType)], facet.name) || null,
                viewType: facet.viewType,
                pivot: facet.facetType == 'facet_pivot',
                resultsAmount: facetData.length,
                showFullList: facet.showFullListAfterFilter,
              };
              if (!facet.group) {
                vm.facets.ungrouped[facet.positionInGroup] = newFacet;
              } else {
                var groupId = getGroupId(vm.facets.groups, 'groupName', facet.group);
                if(groupId == -1) {
                  vm.facets.groups.push({ groupName: facet.group, facets: []});
                  groupId = getGroupId(vm.facets.groups, 'groupName', facet.group);
                }
                vm.facets.groups[groupId].facets[facet.positionInGroup] = newFacet;
              }
            }
          }
        })
      });
    }

    function shouldBeUpdated(facetData, facet) {
      var hasNewResult = true;
      if (facetData && (facetData.length > 0 || facet.showIfNoResponse)){
        if (!facet.group) {
          var facetId = facet.positionInGroup;
          if (vm.facets.ungrouped[facetId]) {
            hasNewResult = facetData.length > vm.facets.ungrouped[facetId].resultsAmount;
          }

          return !(facet.showFullListAfterFilter && !hasNewResult);
        } else {
          var groupId = getGroupId(vm.facets.groups, 'groupName', facet.group);
          if (groupId != -1 && vm.facets.groups[groupId][facet.positionInGroup]) {
            hasNewResult = facetData.length > vm.facets.groups[groupId][facet.positionInGroup].resultsAmount;
          }

          return !(facet.showFullListAfterFilter && !hasNewResult);
        }
      }
      clearFacet(facet);
      return false;
    }

    function clearFacet(facet) {
      if (facet.group) {
        var groupId = getGroupId(vm.facets.groups, 'groupName', facet.group);
        if (vm.facets.groups[groupId]) {
          vm.facets.groups[groupId].facets[facet.positionInGroup] = {};
        }
      } else {
        vm.facets.ungrouped[facet.positionInGroup] = {};
      }
    }

    function getGroupId(group, attr, pattern) {
      var id = -1;
      _.forEach(group, function (val, key) {
        if (val[attr] == pattern) {
          id = key;
          return false;
        }
      });

      return id;
    }

    /**
     * Retrieves the facet type from the facetType variable
     * @param  {string} facetType facet type present in responseHeader.params
     * @return {string}           facet type split from the initial string
     */
    function retrieveFacetType(facetType){
      if (facetType === 'facet_queries') {
        return 'query';
      }
      if (facetType === 'facet_pivot') {
        return 'pivot';
      }

      //example: @param: facet_fields, @return: field
      return facetType.split('_')[1].slice(0,-1);
    }

    function getFieldsLabel(name) {
      return ConfigService.config.field_display_labels[name];
    }

    function getFieldsViewType(value) {
      return ConfigService.config.field_view_type[value];
    }

  }
})();
