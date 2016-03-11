module.exports = function(app) {
app.controller('CalendarController', ['$scope', '$http', function($scope, $http) {

// _ _ _ _ _ SCOPE VARIABLES _ _ _ _ _ //

    $scope.dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']; //Static array. populates calendar header via ng-repeat
    $scope.categories = [];
    $scope.showEventPopup = false;
    $scope.showingNewCategoryForm = false;
    $scope.showingEditTab = true;
    $scope.eventInput = {};
    $scope.categoryInput = {};
    
// _ _ _ _ _ GLOBAL VARIABLES _ _ _ _ _ //

    var dayPointer; //gets set by showEventCreationPopup, then accessed again in createEvent should the user save an event
    var today = new Date(); 
    var curMonthNum = today.getMonth(); //month which calendar is currently displaying. Intializes to current month
    var year = today.getFullYear(); //year which calendar is currently displaying. Initializes to current year
    var monthLengths; //gets set by setMonthLengths function when needed
    var dateToIndexMap = {}; //used to look up an index in $scope.days based on a dateString
    var dayViewPointer; //index number of dayViewDay in $scope.days

// _ _ _ _ _ MAIN FUNCTIONS _ _ _ _ _ //

    $scope.deleteCategory = function() {
        var id = $scope.selectedCategory._id;

        var successCb = function(res) {
            $scope.selectedCategory = null;
            loadCategories();
            console.log('Category deleted.');
        };
        var errorCb = function(err) {
            console.log('Deletion failed.');
        };
        var req = {
            method: 'DELETE',
            url:'/categories/' + id
        };
        $http(req).then(successCb, errorCb);
    };

    $scope.editCategory = function() {
        var inputs = $scope.categoryInput;
        var id = $scope.selectedCategory._id;
        var successCb = function(res) {
            $scope.selectedCategory = null;
            angular.element('.colorPicker-picker').css('background', 'white');
            $scope.categoryInput = {};
            loadCategories();
            console.log('Category modified.');
        };
        var errorCb = function(err) {
            console.log('Edit failed.');
        };
        var req = {
            method: 'PUT',
            url:'/categories/edit/' + id,
            data: 
                {   
                    name: inputs.editName,
                    color: inputs.editColor
                }
        };
        $http(req).then(successCb, errorCb);
    }

    function renderCalendar() {
        dateToIndexMap = {};
        setMonthLengths(); //sets global var monthLengths based on year, accounting for leap years
        $scope.days = []; //this array will populate each day in calendar via ng-repeat
        var extraDays = findExtraDays(); //returns an object with two properties, both numbers
        
        for(var i=extraDays.beginning; i<monthLengths[curMonthNum] + extraDays.end; i++) {
            var day = new Date(year, curMonthNum, i+1); //Automatic adjustments made by Date Object: April 0 -> March 31, April -1 -> March 30, April 31 -> May 1, etc.
            $scope.days.push({date: day, events: []});
            var dateString = getDateString(day);
            dateToIndexMap[dateString] = (i - extraDays.beginning);
        }
        
        var curYearMonthString = year + '-' + curMonthNum;
        var prevYearMonthString = getPrevYearMonth(year, curMonthNum);
        var nextYearMonthString = getNextYearMonth(year, curMonthNum);

        loadEventsForMonth(curYearMonthString);
        if (extraDays.beginning !== 0) loadEventsForMonth(prevYearMonthString);
        if (extraDays.end !== 0) loadEventsForMonth(nextYearMonthString);
    }

    function loadEventsForMonth(yearMonthString) {
        $http.get('/events/year-month/' + yearMonthString).then(function (res){
            res.data.forEach(event => {
                var index = dateToIndexMap[event.date];
                if (index >= 0 && index < $scope.days.length) $scope.days[index].events.push(event);
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
        var inputs = $scope.categoryInput;

        var successCb = function(res) {
            console.log('Category saved.');
            $http.get('/categories/all').then(function (res){
                var lastCategoryAdded = res.data[res.data.length-1];
                $scope.categories.push(lastCategoryAdded);
                angular.element('.colorPicker-picker').css('background', 'white');
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
                    name: inputs.name,
                    color: inputs.color
                }
        };

        if (validTextColour(inputs.color)) {
            $scope.categoryInput = {};
            $http(req).then(successCb, errorCb);
        } else {
            alert('Not a valid css color string.');
        }
    };

    $scope.scroll = function(val) {
        if ($scope.showingDayView) {

            dayViewPointer += val;
            $scope.dayViewDay = $scope.days[dayViewPointer];

        } else {

            curMonthNum += val;

            if (curMonthNum === 12) { //if month is after December, set month back to January and increment year
                year++;
                curMonthNum = 0;
            } else if (curMonthNum === -1) { //if month is before January, set month to December and decrement year
                year--; 
                curMonthNum = 11;
            }

        	renderCalendar();
        }
    };
    
    $scope.createEvent = function() {
        var inputs = $scope.eventInput;
        var eventDate = getDateString(dayPointer.date);
        var monthNum = dayPointer.date.getMonth();
        var yearNum = dayPointer.date.getFullYear();
        var yearMonthString = yearNum + '-' + monthNum;
        var MIN_PER_HOUR = 60;

        var startHour = Number(inputs.startHour);
        if (startHour == 12) startHour = 0;
        var endHour = Number(inputs.endHour);
        if (endHour == 12) endHour = 0;
        var startTime = startHour + Number(inputs.startMinute/MIN_PER_HOUR);
        if (inputs.startAMPM == 'PM') startTime += 12;
        var endTime = endHour + Number(inputs.endMinute/MIN_PER_HOUR); 
        if (inputs.endAMPM == 'PM') endTime += 12;
        var time = [parseFloat(startTime).toFixed(4), parseFloat(endTime).toFixed(4)];

        $scope.eventInput = {}; //resets input fields
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
                    name: inputs.name,
                    description: inputs.description,
                    date: eventDate,
                    yearmonth: yearMonthString,
                    time: time,
                    category: inputs.category
                }
        };

        $http(req).then(successCb, errorCb);
    };

    $scope.openDayView = function(day, index) {
        $scope.dayViewDay = day;
        dayViewPointer = index;

        $scope.timesInDay = [];
        var startTime = 9; //6:00 AM
        var endTime = 23.5; //11:30 PM

        for(var i=startTime; i<=23.5; i+= .5) {
            $scope.timesInDay.push(i);
        }

        $scope.showingDayView = true;
    };


// _ _ _ _ _ HELPER FUNCTIONS _ _ _ _ _ //

    $scope.openMonthView = function() {
        $scope.showingDayView = false;
    };

    $scope.calculateHeight = function(time) {
        var VERT_PIXELS_PER_HOUR = 46;
        var eventLength = time[1] - time[0]; //in hours. 4.6667 = 4 hours and 40 minutes
        var height = eventLength * VERT_PIXELS_PER_HOUR;

        return height;
    };

    $scope.assignMargin = function(time) {
        var VERT_PIXELS_PER_HOUR = 46;

        var startTable = 9; //CHANGE TO MATCH OTHER 
        var timeFromTop = time[0] - startTable;
        var pixels = Math.round(timeFromTop * VERT_PIXELS_PER_HOUR);
        return pixels + 'px';
    };

    $scope.timify = function(num) { //takes a number where 0 <= number < 24      
        var AMorPM;
        var hours = Math.floor(num);
        var minutes = num - hours;
        minutes = Math.floor(minutes * 60).toFixed(0);
        if (hours < 12) {
            AMorPM = 'AM';
        } else {
            AMorPM = 'PM';
            hours = hours - 12;
        } 

        if (hours == 0) hours = 12;
        if (minutes < 10) minutes = '0' + minutes;

        var timeString = hours + ':' + minutes + ' ' + AMorPM;
        return timeString;
    };

    $scope.selectCategory = function(category) {
        if (category == $scope.selectedCategory) {
            $scope.selectedCategory = null;
        } else {
            $scope.selectedCategory = category;
            angular.element('.colorPicker-picker').css('background', category.color);
        }

    };

    $scope.showNewTab = function() {
        $scope.showingNewTab = true;
        $scope.showingEditTab = false;
    };

    $scope.showEditTab = function() {
        $scope.showingNewTab = false;
        $scope.showingEditTab = true;
    };

    function loadCategories() {
        $http.get('/categories/all').then(function (res){
            $scope.categories = res.data;
            $scope.selectedCategory = $scope.categories[0];
            renderCalendar();
        });
    }

    $scope.getColorFromCategory = function(categoryID) {
        var color = 'black';            
        $scope.categories.forEach(category => {
            if(category._id === categoryID) color = category.color;
        });
        return color;           
    };

    $scope.setDayNameBG = function(index) { // in the calendar header with the names of each day, this method gives a special class to the current day
        if (index === today.getDay() && curMonthNum === today.getMonth()) return 'current-day';
    };

    $scope.showCategoryCreation = function() {
        $scope.showingNewCategoryForm = !$scope.showingNewCategoryForm;
        $scope.categoryInput = {};
        angular.element('.colorPicker-picker').css('background', 'white');
    };

    $scope.setBG = function(date) {
        var monthNum = date.getMonth();
        var dateNum = date.getDate();

        if(dateNum === today.getDate() && monthNum === today.getMonth()) return 'current-day';
        if(monthNum !== curMonthNum) return 'out-of-cur-month';
        else return 'no-special-style';
    };

    $scope.onPageLoad = function() { //runs on init. 
        angular.element('#color1').colorPicker();
        angular.element('#color2').colorPicker();
        loadCategories(); //renders calendar after loading categories
    };

    $scope.showEventCreationPopup = function(day) {
        $scope.showEventPopup = true;
        $scope.hours = ['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
        $scope.minuteStrings = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
        $scope.AMPM = ['AM', 'PM'];
        $scope.eventInput.startHour = $scope.hours[0];
        $scope.eventInput.startMinute = $scope.minuteStrings[0];
        $scope.eventInput.startAMPM = $scope.AMPM[1];
        $scope.eventInput.endHour = $scope.hours[1];
        $scope.eventInput.endMinute = $scope.minuteStrings[0];
        $scope.eventInput.endAMPM = $scope.AMPM[1];

        dayPointer = day; // dayPointer will be accessed from createEvent function
        var date = day.date;
        $scope.newEventDate = $scope.dayNames[date.getDay()] + ' ' + (date.getMonth()+1) + '/' + date.getDate();
    };

    $scope.closeEventCreationPopup = function() {
        $scope.eventInput = {};
        $scope.showEventPopup = false;
    };

    $scope.displayViewDate = function() {
        var returnString = '';
        var monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        if($scope.showingDayView) {
            var date = $scope.dayViewDay.date;
            var dayName = $scope.dayNames[date.getDay()];
            var monthName = monthNames[date.getMonth()];
            var dateNum = date.getDate();
            var yearNum = date.getFullYear();
            returnString = trim(dayName) + ' ' + trim(monthName) + ' ' + dateNum + ' ' + yearNum;
        } else {
            returnString = monthNames[curMonthNum] + ' ' + year;
        }

        return returnString;
    };

    function trim(string) {
        if (string.length > 3) return string.substring(0, 3);
        else return string;
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

    function getPrevYearMonth(year, monthNum) {
        var prevMonthNum = monthNum - 1;

        if (prevMonthNum === -1) return (year-1) + '-11'; ///returns 2015-11 instead of 2016--1
        else return year + '-' + prevMonthNum;
    }

    function getNextYearMonth(year, monthNum) {
        var nextMonthNum = monthNum + 1;

        if (nextMonthNum === 12) return (year+1) + '-0'; // returns 2017-0 instead of 2016-12
        else return year + '-' + nextMonthNum;
    }

    $scope.disableEdit = function() {
        var inputs = $scope.categoryInput;
        if (inputs.editColor) return false;
        if (inputs.editName) return false;
        return true;
    };

    function validTextColour(stringToTest) { // taken from http://stackoverflow.com/questions/6386090/validating-css-color-names
    //Alter the following conditions according to your need.
        if (stringToTest === "") { return false; }
        if (stringToTest === "inherit") { return false; }
        if (stringToTest === "transparent") { return false; }

        var image = document.createElement("img");
        image.style.color = "rgb(0, 0, 0)";
        image.style.color = stringToTest;
        if (image.style.color !== "rgb(0, 0, 0)") { return true; }
        image.style.color = "rgb(255, 255, 255)";
        image.style.color = stringToTest;
        return image.style.color !== "rgb(255, 255, 255)";
    }

// _ _ _ _ _ END OF CONTROLLER _ _ _ _ _ //
}]);
};