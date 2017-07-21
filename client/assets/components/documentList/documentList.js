(function () {
  'use strict';

  angular
    .module('lucidworksView.components.documentList', ['lucidworksView.services.config',
      'ngOrwell', 'lucidworksView.services.landingPage'
    ])
    .directive('documentList', documentList);

  function documentList() {
    'ngInject';
    return {
      restrict: 'EA',
      templateUrl: 'assets/components/documentList/documentList.html',
      controller: Controller,
      controllerAs: 'vm',
      bindToController: {},
      scope: true,
      replace: true
    };

  }

  function Controller($sce, $log, $anchorScroll, Orwell, $rootScope, ConfigService) {
    'ngInject';
    var vm = this;
    vm.docs = [];
    vm.highlighting = {};
    vm.getDocType = getDocType;
    vm.groupedResults = false;
    vm.toggleGroupedResults = toggleGroupedResults;
    vm.showGroupedResults = {};
    vm.getDocPosition = getDocPosition;

    activate();

    ////////

    function activate() {
      var resultsObservable = Orwell.getObservable('queryResults');
      resultsObservable.addObserver(function (data) {
        var docs = parseDocuments(data);
        /*console.log("Documents count in response: " + docs.length);
        if(docs.length) {
          console.log("First document title in response: '" + docs[0].title_t[0] + "'");
          console.log("First document in response: ");
          console.log(docs[0]);
        }*/
        var showTextDoc = ConfigService.config.show_test_document;
        if (showTextDoc && noTestDocument(docs)) {
          var testDoc = {
            image_s: 'wiki2.jpg',
            url_s: 'https://www.wikipedia.org/',
            title_t: ['Test document'],
            _lw_data_source_s: 'rightAnswers',
            lw_head: {
              key: 'Test document',
            }
           };
          docs.unshift(testDoc);
        }
        vm.docs = docs;
        $rootScope.$broadcast('documentLoad');
        vm.highlighting = parseHighlighting(data);
        vm.getDoctype = getDocType;
        $anchorScroll('topOfMainContent');
      });
    }

    function noTestDocument(docs) {
      return docs.length && docs[0].title_t && docs[0].title_t[0] !== 'Test document';
    }

    /**
     * Get the document type for the document.
     * @param  {object} doc Document object
     * @return {string}     Type of document
     */
    function getDocType(doc){
      // Change to your collection datasource type name
      // if(doc['_lw_data_source_s'] === 'MyDatasource-default'){
      //   return doc['_lw_data_source_s'];
      // }
      return doc['_lw_data_source_type_s'];
    }

    /**
     * Decorates the document object before sending to the document directive.
     * @param  {object} doc Document object
     * @return {object}     Document object
     */

    function isNotGrouped(data){
      return _.has(data, 'response');
    }
    function isGrouped(data){
      return _.has(data, 'grouped');
    }
    /**
     * Get the documents from
     * @param  {object} data The result data.
     * @return {array}       The documents returned
     */
    function parseDocuments(data){
      var docs = [];
      if (isNotGrouped(data)) {
        docs = data.response.docs;
      }
      else if(isGrouped(data)){
        vm.groupedResults = data.grouped;
        parseGrouping(vm.groupedResults);
      }
      return docs;
    }


    function toggleGroupedResults(toggle){
      vm.showGroupedResults[toggle] = !vm.showGroupedResults[toggle];
    }

    function parseGrouping(results){
      _.each(results, function(item){
        if (_.has(item, 'groups')){
          _.each(item.groups, function(group){
            if(_.has(group, 'groupValue') && group.groupValue !== null){
              vm.showGroupedResults[group.groupValue] = false;
            }
            else{
              vm.showGroupedResults['noGroupedValue'] = true;
            }
          });
        }
        else{
          vm.groupedDocs = item.doclist.docs;
          vm.showGroupedResults['simpleGrouped'] = true;
        }
      });
    }

    /**
     * Get highlighting from a document.
     * @param  {object} data The result data.
     * @return {object}      The highlighting results.
     */
    function parseHighlighting(data) {
      if (data.hasOwnProperty('highlighting')){
        _.each(data.highlighting, function(value, key){
          var vals = {};
          if (value) {
            _.each(Object.keys(value), function (k) {
              var val = value[k];
              _.each(val, function(high) {
                console.log(key + " -> " + k + " -> " + high);
                vals[k] = $sce.trustAsHtml(high);

                console.log(vals[k]);
              });
            });
            vm.highlighting[key] = vals;
          }
        });
      } else{
        vm.highlighting = {};
      }
      return vm.highlighting;

      /*
       if (data.hasOwnProperty('highlighting')){
       vm.highlighting = _.mapValues(data.highlighting, function (docFields) {
       return _.mapValues(docFields, function (docFieldVal) {
       return $sce.trustAsHtml(docFieldVal);
       })
       });
       } else{
       vm.highlighting = {};
       }
      * */
    }

    /**
     * Get index of the doc in the returned documentList
     * @param  {object} doc  Doc of which the index is required
     * @param  {object} docs List of returned documents
     * @return {number}      The index of the document in the documentList
     */
    function getDocPosition(doc, docs){
      return _.findIndex(docs, doc);
    }
  }
})();
