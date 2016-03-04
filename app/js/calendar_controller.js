module.exports = function(app) {
app.controller('CalendarController', ['$scope', '$http', function($scope, $http) {

// _ _ _ _ _ HELPER VARIABLES _ _ _ _ _ //

    var today = new Date(); //only gets used for initializaiton of global variables
    $scope.dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']; //Static array. populates calendar header via ng-repeat
    $scope.categories = [{name: 'Personal',
                          color: 'green'},
                         {name: 'Profressional',
                          color: 'red'}];
    $scope.showEventPopup = false;
    $scope.showingNewCategoryForm = false;
    $scope.userInput = {};
    var dayPointer;
    
// _ _ _ _ _ GLOBAL VARIABLES _ _ _ _ _ //

    var curMonthNum = today.getMonth(); //month which calendar is currently displaying. Intializes to current month
    var year = today.getFullYear(); //year which calendar is currently displaying. Initializes to current year
    var monthLengths; //gets set by setMonthLengths function when needed


// _ _ _ _ _ MAIN FUNCTIONS _ _ _ _ _ //

    function renderCalendar() {
        setMonthLengths(); //sets global var monthLengths based on year, accounting for leap years
        $scope.days = []; //this array will populate each day in calendar via ng-repeat
        var extraDays = findExtraDays(); //returns an object with two properties, both numbers
        
        for(var i=extraDays.beginning; i<monthLengths[curMonthNum] + extraDays.end; i++) {
            var day = new Date(year, curMonthNum, i+1); //Automatic adjustments made by Date Object: April 0 -> March 31, April -1 -> March 30, April 31 -> May 1, etc.
            $scope.days.push({date: day, events: []});
        }

        $scope.days.forEach(day => {
            var dateString = getDateString(day.date);
            $http.get('/events/date/' + dateString).then(function (res){
                day.events = res.data;
            });
        });
    }

    $scope.deleteEvent = function(id, day) {
        var dateString = getDateString(day.date);
        var successCb = function(res) {
            console.log('Event deleted.');
            $http.get('/events/date/' + dateString).then(function (res){ //reloads events for that day after deletion
                day.events = res.data;
            });
        };
        var errorCb = function(err) {
            console.log('Deletion failed.');
        };
        var req = {
            method: 'DELETE',
            url:'/events/' + id
        };
        $http(req).then(successCb, errorCb);
    };

    $scope.createCategory = function() {
        var inputs = $scope.userInput;
        $scope.userInput = {};
        var successCb = function(res) {
            console.log('Category saved.');
            $http.get('/categories/all').then(function (res){
                var lastCategoryAdded = res.data[res.data.length-1];
                $scope.categories.push(lastCategoryAdded);
            });
        };
        var errorCb = function(err) {
            console.log('Save failed.');
        };
        var req = {
            method: 'POST',
            url:'/newcategory/',
            data: 
                {   
                    name: inputs.categoryName,
                    color: inputs.categoryColor
                }
        };

        $http(req).then(successCb, errorCb);
    };

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
        var eventDate = getDateString(dayPointer.date);
        var monthNum = dayPointer.date.getMonth();
        console.log(monthNum);

        $scope.userInput = {};
        var successCb = function(res) {          
            $http.get('/events/date/' + eventDate).then(function (res){
                dayPointer.events = res.data;
            });
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
                    month: monthNum,
                    time: inputs.eventTime,
                    category: inputs.eventCategory
                }
        };

        $http(req).then(successCb, errorCb);
    };


// _ _ _ _ _ HELPER FUNCTIONS _ _ _ _ _ //

    function loadCategories() {
        $http.get('/categories/all').then(function (res){
            res.data.forEach(category => {
                $scope.categories.push(category);
                renderCalendar();
            });
        });
    }

    $scope.getColorFromCategory = function(categoryName) {
        var color = 'black';            
        $scope.categories.forEach(category => {
            if(category.name === categoryName) color = category.color;
        });
        return color;           
    };

    $scope.setDayNameBG = function(index) { // in the calendar header with the names of each day, this method gives a special class to the current day
        if (index === today.getDay()) return 'current-day';
    };

    $scope.showCategoryCreation = function() {
        $scope.showingNewCategoryForm = !$scope.showingNewCategoryForm;
    };

    $scope.setBG = function(date) {
        var monthNum = date.getMonth();
        var dateNum = date.getDate();

        if(monthNum !== curMonthNum) return 'out-of-cur-month';
        if(dateNum === today.getDate() && monthNum === today.getMonth()) return 'current-day';
        else return 'current-month';
    };

    $scope.onPageLoad = function() { //runs on init. 
        loadCategories(); //renders calendar after loading categories
    };

    $scope.showEventCreationPopup = function(day) {
        $scope.showEventPopup = true;
        dayPointer = day; 
    };

    $scope.closeEventCreationPopup = function() {
        $scope.userInput = {};
        $scope.showEventPopup = false;
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