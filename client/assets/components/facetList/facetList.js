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

        /*// Iterate through each facet type.
        _.forEach(data.facet_counts, resultFacetParse);

        function resultFacetParse(resultFacets, facetType){
          // Keep a list of facet names and only reflow facets based on changes to this list.
          // var facetFieldsWithData = removeEmptyFacets(resultFacets);
          // var facetFields = Object.keys(facetFieldsWithData);
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
              debugger;
              var facet = {
                name: value,
                type: facetType,
                autoOpen: true,
                label: getFieldsLabel(value)|| value, //ConfigService.getFieldLabels()[value], needed to edit FUSION_CONFIG to use
                tag: LocalParamsService.getLocalParamTag(vm.facetLocalParams[retrieveFacetType(facetType)], value) || null,
                viewType: getFieldsViewType(value),
                pivot: retrieveFacetType(facetType) == 'pivot',
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
        vm.facets = {
          ungrouped: [],
          groups: [],
        };
        var facetsConfig = ConfigService.config.facets;
        _.forEach(facetsConfig, function(facet, key) {
          var facetData = data.facet_counts[facet.facetType][facet.name];
          if (facetData && (facetData.length > 0 || (facetData.length == 0 && facet.showIfNoResponse))) {
            var newFacet = {
              name: facet.name,
              type: facet.facetType,
              autoOpen: true,
              label: facet.label,
              tag: LocalParamsService.getLocalParamTag(vm.facetLocalParams[retrieveFacetType(facet.facetType)], facet.name) || null,
              viewType: facet.viewType,
              pivot: facet.facetType == 'facet_pivot',
            };
            if (!facet.group) {
              vm.facets.ungrouped.push(newFacet);
            } else {
              var groupId = getGroupId(facet.group);
              if(groupId == -1) {
                vm.facets.groups.push({ groupName: facet.group, facets: [newFacet]});
              } else {
                vm.facets.groups[groupId].facets.push(newFacet);
              }
            }
          }
        })
      });
    }

    function getGroupId(groupName) {
      var id = -1;
      _.forEach(vm.facets.groups, function (val, key) {
        if (val.groupName == groupName) {
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
