module.exports = function(app) {
app.controller('CalendarController', ['$scope', '$http', function($scope, $http) {

// _ _ _ _ _ HELPER VARIABLES _ _ _ _ _ //

    var today = new Date(); //only gets used for initializaiton of global variables
    $scope.dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']; //Static array. populates calendar header via ng-repeat
    $scope.showEventPopup = false;
    $scope.userInput = {};
    var eventDate;
    
// _ _ _ _ _ GLOBAL VARIABLES _ _ _ _ _ //

    var curMonthNum = today.getMonth(); //month which calendar is currently displaying. Intializes to current month
    var year = today.getFullYear(); //year which calendar is currently displaying. Initializes to current year
    var monthLengths; //gets set by setMonthLengths function when needed


// _ _ _ _ _ MAIN FUNCTIONS _ _ _ _ _ //

    function renderCalendar() {
        setMonthLengths(); //sets global var monthLengths based on year, accounting for leap years
		$scope.days = []; //populates each day in calendar via ng-repeat
        var extraDays = findExtraDays(); //returns an object with two properties
        
	    for(var i=extraDays.beginning; i<monthLengths[curMonthNum] + extraDays.end; i++) {
	    	var day = new Date(year, curMonthNum, i+1); //Automatic adjustments made by Date Object: April 0 -> March 31, April -1 -> March 30, April 31 -> May 1, etc.
            $scope.days.push({date: day, events: []});
	    }

        $scope.days.forEach(day =>{
            var dateString = getDateString(day.date);
            $http.get('/events/' + dateString).then(function (res){
                day.events = res.data;
            });
        });
    }

    $scope.scroll = function(val) {
    	curMonthNum += val;

        if (curMonthNum === 12) { //if month is after December, set month back to January and increment year
            year++;
            curMonthNum = 0;
        } else if (curMonthNum === -1) { //if month is before January, set month to December and decrement year
            year--;
            curMonthNum = 11;
        }

    	renderCalendar();
    };
    
    $scope.createEvent = function() {
        var inputs = $scope.userInput;
        $scope.userInput = {};
        var successCb = function(res) {
            //CHANGE THIS PART TO ONLY MAKE ONE REQUEST/// 
            $scope.days.forEach(day =>{
                var dateString = getDateString(day.date);
                $http.get('/events/' + dateString).then(function (res){
                    day.events = res.data;
                });
            });
            ///////////////////////
            console.log('Event saved.');
            $scope.showEventPopup = false;
        };
        var errorCb = function(err) {
            console.log('Save failed.');
        };
        var req = {
            method: 'POST',
            url:'/newevent/',
            data: 
                { 
                    name: inputs.eventName,
                    description: inputs.eventDescription,
                    date: eventDate,
                    time: inputs.eventTime
                }
        };
        $http(req).then(successCb, errorCb);
    };


// _ _ _ _ _ HELPER FUNCTIONS _ _ _ _ _ //

    $scope.hideOtherMonths = function(monthNum) {
        if(monthNum !== curMonthNum) return 'another-month';
        else return 'current-month';
    };

    $scope.onPageLoad = function() {
        renderCalendar();
    };

    $scope.showEventCreationPopup = function(date) {
        $scope.showEventPopup = true;
        eventDate = getDateString(date);
    };

    $scope.displayMonthAndYear = function() {
        var monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        return monthNames[curMonthNum] + ' ' + year;
    };

    function getDateString(date) {
        var dateString = date.toLocaleDateString(); //March 1 2016 -> 3/1/2016 
        dateString = dateString.replace(/\//g, '-'); //replaces slashes with hyphens. 3-1-2016
        return dateString;
    }

    function setMonthLengths() {
        if(year % 4 === 0) monthLengths = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        else monthLengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    }
   
    function findExtraDays() { //finds how many days to add to end and beginning of calendar to maintain sunday to saturday grid format
        var firstDayOfMonth = new Date(year, curMonthNum, 1);
        var whichDayIsFirst = firstDayOfMonth.getDay(); //this variable will be a number. if first of month is a Sunday, it will be 0. If monday, it will be 1.
        var daysToAddToStart = -1 * whichDayIsFirst; //renderCalendar() initializes its for loop at this negative number (or zero)

        var lastDayOfMonth = new Date(year, curMonthNum, monthLengths[curMonthNum]);
        var whichDayIsLast = lastDayOfMonth.getDay();
        var daysToAddToEnd = 6 - whichDayIsLast;
        return {beginning: daysToAddToStart, end: daysToAddToEnd};    
    }


// _ _ _ _ _ END OF CONTROLLER _ _ _ _ _ //
}]);
};