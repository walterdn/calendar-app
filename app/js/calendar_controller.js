module.exports = function(app) {
app.controller('CalendarController', ['$scope', function($scope) {

    var today = new Date();
    var curMonthNum = today.getMonth();
    var year = today.getFullYear();
    if(year % 4 === 0) var daysInMonths = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    else var daysInMonths = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];


    $scope.renderCalendar = function() {
		$scope.days = [];

	    var firstDayOfMonth = new Date(year, curMonthNum, 1);
	    var whichDayIsFirst = firstDayOfMonth.getDay(); //this variable will be a number. if first of month is a Sunday, it will be 0. If monday, it will be 1.
	    var daysToAddToStart = -1 * whichDayIsFirst; 


	    var lastDayOfMonth = new Date(year, curMonthNum, daysInMonths[curMonthNum]);
	    var whichDayIsLast = lastDayOfMonth.getDay();

	    var daysToAddToEnd = 6 - whichDayIsLast;	
	    


	    for(var i=daysToAddToStart; i<daysInMonths[curMonthNum] + daysToAddToEnd; i++) {
	    	var day = new Date(year, curMonthNum, i+1);

	        $scope.days.push(day);
	    }
    }

    $scope.hideOtherMonths = function(monthNum) {
    	if(monthNum !== curMonthNum) return 'another-month';
    	else return 'current-month';
    };


    $scope.scroll = function(val) {
    	curMonthNum += val;
    	var yearModifier = Math.floor(curMonthNum / 12);
    	year += yearModifier;

    	curMonthNum = curMonthNum % 12;

    	$scope.renderCalendar();
    };

    $scope.displayMonth = function() {
    	var monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    	return monthNames[curMonthNum] + ' ' + year;
    };


////END OF CONTROLLER
}]);
};