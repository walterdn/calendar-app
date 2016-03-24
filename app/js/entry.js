require('angular/angular');
require('angular-route');
require('./ngDraggable');
var angular = window.angular;

var calendarApp = angular.module('CalendarApp', ['ngRoute', 'ngDraggable']);
require('./calendar_controller')(calendarApp);

calendarApp.config(['$routeProvider', function($route) {
  $route
    .when('/', {
      templateUrl: '/templates/calendar.html',
      controller: 'CalendarController'
    })

    .otherwise({
      templateUrl: '/templates/calendar.html',
      controller: 'CalendarController'
    })
}]);
