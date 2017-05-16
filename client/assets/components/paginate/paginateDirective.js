(function () {
  'use strict';

  angular
    .module('lucidworksView.components.paginate')
    .directive('paginate', paginate);

  function paginate() {
    'ngInject';
    var directive = {
      restrict: 'EA',
      templateUrl: 'assets/components/paginate/paginate.html',
      controller: Controller,
      controllerAs: 'vm',
      bindToController: true,
      scope: true
    };

    return directive;

  }

  function Controller(Orwell, PaginateService, QueryService, $filter) {
    'ngInject';
    var vm = this;
    vm.page = 0;
    vm.totalPages = 0;
    vm.getNormalizedPage = getNormalizedPage;
    vm.getNormalizedPageFormatted = getNormalizedPageFormatted;
    vm.getLastPage = getLastPage;
    vm.gotoNextPage = gotoNextPage;
    vm.gotoPreviousPage = gotoPreviousPage;
    vm.gotoPage = gotoPage;
    vm.showState = 'next';
    vm.paginationPagesShow = 5;

    activate();

    /////////////

    function activate() {
      var resultsObservable = Orwell.getObservable('queryResults');

      resultsObservable.addObserver(function (data) {
        if (data.hasOwnProperty('response')) {
          vm.page = PaginateService.getCurrentPage();
          vm.totalPages = PaginateService.getTotalPages();
          vm.totalPagesFormatted = $filter('humanizeNumberFormat')(vm.totalPages, 0);
          vm.showState =  pickPaginatorType();
          vm.paginationPages = getPaginationPages();
        } else {
          vm.page = 0;
          vm.totalPages = 0;
        }
      });
    }

    function pickPaginatorType(){
      if(vm.totalPages < 1) return 'neither';
      if(vm.page === 0 && vm.totalPages > 1) return 'next';
      if(vm.page === vm.getLastPage() && vm.page > 0) return 'previous';
      if(vm.page !== vm.getLastPage()) return 'both';
    }

    /**
     * Get the page number (normalized for viewers from a 1 base)
     * @return {integer} normalized page number
     */
    function getNormalizedPage() {
      return vm.page + 1;
    }

    function getNormalizedPageFormatted(){
      return $filter('humanizeNumberFormat')(getNormalizedPage(), 0);
    }

    /**
     * Get the last page (0 start based)
     * @return {integer} The last page from 0 base.
     */
    function getLastPage() {
      return vm.totalPages - 1;
    }

    /**
     * Updates the query parameters to the next page.
     */
    function gotoNextPage() {
      gotoPage(PaginateService.getCurrentPage() + 1);
      vm.paginationPages = getPaginationPages();
    }

    /**
     * Updates the query parameters to the previous page.
     */
    function gotoPreviousPage() {
      gotoPage(PaginateService.getCurrentPage() - 1);
      vm.paginationPages = getPaginationPages();
    }

    /**
     * Actually updates the page to go to.
     * @param  {integer} page The page to do to
     */
    function gotoPage(page) {
      if (page < 0) return;
      if (page > PaginateService.getTotalPages()) return;
      if (page === PaginateService.getCurrentPage()) return;
      // This will change the query and cause the interface to make an http call.
      QueryService.setQuery({
        start: PaginateService.pageToStartRow(page)
      });
      vm.paginationPages = getPaginationPages();
    }

    function getPaginationPages() {
      var paginationPages = [];
      for (var i = 1; i <= vm.paginationPagesShow; i++) {
        if (vm.page + i <= vm.totalPages) {
          paginationPages.push({nmb: vm.page + i});
        }
      }
      return paginationPages;
    }

  }
})();
