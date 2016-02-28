require('angular/angular');
require('angular-route');
var angular = window.angular;

var calendarApp = angular.module('CalendarApp', ['ngRoute']);
require('./calendar_controller')(calendarApp);

calendarApp.config(['$routeProvider', function($route) {
  $route
    .when('/', {
      templateUrl: '/templates/calendar.html',
      controller: 'CalendarController'
    })

    .otherwise({
      redirectTo: '/'
    })
}]);
