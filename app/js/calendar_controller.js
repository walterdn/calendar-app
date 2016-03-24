var h = require('./static_functions');
var CalMonth = require('./calendar_month_class');

module.exports = function(app) {
app.controller('CalendarController', ['$scope', '$location', '$http', function($scope, $location, $http) {

    var curMonth; 

// _ _ _ _ _ SCOPE VARIABLES _ _ _ _ _ //

    $scope.categories = [];
    $scope.showingEventPopup = false;
    $scope.renderingCategoryMenu = true;
    $scope.showingCategoryMenu = false;
    $scope.showingEditTab = true;
    $scope.eventInput = {};
    $scope.categoryInput = {};
    $scope.view = 'month'; //either month, week, or day
    
// _ _ _ _ _ STATIC VARIABLES _ _ _ _ _ //

    $scope.DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']; //Static array. populates calendar header via ng-repeat
    var WEEK_LENGTH = 7;
    var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// _ _ _ _ _ GLOBAL VARIABLES _ _ _ _ _ //

    var user;
    var today = new Date(); 
    var dayPointer; //gets set by showEventCreationPopup, then accessed again in createEvent should the user save an event
    var eventPointer; //gets set by showEventEditPopup, accessed again in editEvent
    var menuIsBeingToggled = false;
   
    var dateToIndexMap = {}; //used to look up an index in $scope.days based on a dateString
    var dayViewPointer; //index number of dayViewDay in $scope.days
    var weekViewPointer = 0; //index number of first Sunday of weekview in $scope.days
    var timeTableStart = 9; //9AM by default


// _ _ _ _ _ MAIN FUNCTIONS TO MANAGE THE VIEW _ _ _ _ _ //

    $scope.onPageLoad = function() { //runs on init. 
        setUser();
        curMonth = new CalMonth($http, user); 
        angular.element('#color1').colorPicker();
        angular.element('#color2').colorPicker();
        loadCategories().then(loadCalendar); //renders calendar after loading categories
    };

    function setUser() {
        var url = $location.url();
        if (url == '/') {
            user = 'public';
        } else {
            user = url.substring(1, url.length).toLowerCase(); //removes the slash from beginning of url
        }
    }

    function loadCategories() {
        return $http.get('/categories/all/' + user).then(function (res){
            $scope.categories = res.data;
            $scope.selectCategory($scope.categories[0]);
        });
    }

    function loadCalendar() {
        curMonth.renderMonth();
        var indexOfToday = curMonth.getIndexOfToday();
        if (indexOfToday) {
            setWeekViewPointer(indexOfToday);
            dayViewPointer = indexOfToday;
        } 
        
        curMonth.loadEvents().then(function() {
            setDays();
            if ($scope.view == 'day') setDayViewDay();
            if ($scope.view == 'week') setWeekViewDays();
        });
    }

    function setDays() { // sets the MAIN array $scope.days, which populates calendar via ng-repeat
        $scope.days = [];
        $scope.days = curMonth.getDays();
        dateToIndexMap = curMonth.getDateToIndexMap();
    }

    $scope.openDayView = function(day) { //can also be called NOT on a specific day, by calling function without the parameter
        var today = new Date();
        var curMonthNum = curMonth.getMonthNum();
        var year = curMonth.getYear();
        var indexOfToday = curMonth.getIndexOfToday();

        if (day) { //if openDayView called on a specific day
            var dateString = h.getDateString(day.date);
            dayViewPointer = dateToIndexMap[dateString];
        } else { //if called not on a specific day, just by clicking the day view button
            if ($scope.view == 'month') {
                if (curMonthNum == today.getMonth() && year == today.getFullYear()) dayViewPointer = indexOfToday;
                else {
                    dayViewPointer = 0;
                    while ($scope.days[dayViewPointer].date.getMonth() !== curMonthNum) dayViewPointer++;                    
                }
            }
        }
        setWeekViewPointer(dayViewPointer); 
        $scope.view='day';
        setDayViewDay();
    };

    $scope.openWeekView = function() {
        $scope.view = 'week';
        setWeekViewDays();
    };

    $scope.openMonthView = function() {
        $scope.view = 'month';
    };

    function setWeekViewPointer(index) { //parameter is index of a day within $scope.days. this method helps weekViewPointer move with dayViewPointer
        var remainder = index % 7;
        var multipleOfSeven = index - remainder;
        weekViewPointer = multipleOfSeven; //keeping it multiple of seven so that weekview maintains sunday to saturday format
    }

    function setDayViewDay() {
        $scope.dayViewDay = null;
        $scope.dayViewDay = {
            date: $scope.days[dayViewPointer].date,
            events: $scope.days[dayViewPointer].events
        };
        renderTimeTable();
    }

    function setWeekViewDays() {
        $scope.weekViewDays = null;
        $scope.weekViewDays = [];
        for(var i=weekViewPointer; i < (weekViewPointer + WEEK_LENGTH); i++) {
            $scope.weekViewDays.push(
                {   
                    date: $scope.days[i].date,
                    events: $scope.days[i].events
                }
            );
        }
        renderTimeTable();
    }

    function renderTimeTable() {
        timeTableStart = 9; //default 9:00 AM // global variable so that it can be accessed by $scope.assignMargin function
        var timeTableEnd = 23.5; //11:30 PM

        switch ($scope.view) {
            
            case 'week':
                $scope.weekViewDays.forEach(day => {
                    day.events.forEach(event => {
                        var startHour = Math.floor(event.time[0]);
                        timeTableStart = Math.min(timeTableStart, startHour);
                    });
                });
                break;

            case 'day':
                $scope.dayViewDay.events.forEach(event => {
                    var startHour = Math.floor(event.time[0]);
                    timeTableStart = Math.min(timeTableStart, startHour);
                });
                break;
        }

        $scope.timesInDay = [];
        for(var i=timeTableStart; i<=timeTableEnd; i+= .5) {
            $scope.timesInDay.push(i);
        }
    }

    $scope.shiftView = function(val) { //val will either be -1 or 1. -1 = scrolling back, +1 = scrolling forward

        switch ($scope.view) {

            case 'day':
                shiftDayViewPointer(val);
                break;

            case 'week':
                shiftWeekViewPointer(val);
                break;

            case 'month':
                shiftMonthView(val);
                break;
        }
    };

    function shiftMonthView(val) {
        curMonth.shiftMonth(val);
        setDays();
        
        curMonth.loadEvents();

        weekViewPointer = 0;
        
        var curMonthNum = curMonth.getMonthNum();
        var year = curMonth.getYear();
        var indexOfToday = curMonth.getIndexOfToday();

        if (year == today.getFullYear()) { //conditions under which we want to set weekViewPointer to number other than 0
            if (curMonthNum == today.getMonth()) setWeekViewPointer(indexOfToday); //if current month, set weekViewPointer to current week
            if (curMonthNum < today.getMonth()) weekViewPointer = $scope.days.length - WEEK_LENGTH; 
        } 
    }

    function shiftDayViewPointer(val) { //val is 1 or -1, the amount to shift the pointer by
        
        dayViewPointer += val;

        //following block of code runs when we traverse months while in day view
        if (dayViewPointer < 0 || dayViewPointer >= $scope.days.length) { //either condition means we need to shift month scope, and reset dayViewPointer
            curMonth.shiftMonth(val);
            setDays();
            var curMonthNum = curMonth.getMonthNum();
        
            if(val == -1) { //just scrolled back a month
                var lastDayOfScopeMonth = $scope.days[$scope.days.length-1];

                if (lastDayOfScopeMonth.date.getMonth() !== curMonthNum) {
                    dayViewPointer = $scope.days.length - (1 + WEEK_LENGTH); //if overlapping week on border, point to last day of second to last week of new scope month
                } else {
                    dayViewPointer = $scope.days.length - 1; //if no overlapping week on border, point to last day of last week of new scope month
                }
            }

            if(val == 1) { //just scrolled forward a month
                var firstDayOfScopeMonth = $scope.days[0];

                if (firstDayOfScopeMonth.date.getMonth() !== curMonthNum) { //means overlapping week on border
                    dayViewPointer = WEEK_LENGTH;
                } else { // no overlapping week on border between months
                    dayViewPointer = 0;
                }
            }

            curMonth.loadEvents().then(function() {
                setDays();
                setDayViewDay();
            });
        } else {
            setDayViewDay();
        }

        setWeekViewPointer(dayViewPointer); //moves weekViewPointer to move with dayViewPointer
    }

    function shiftWeekViewPointer(val) { //val is 1 or -1, the amount to shift the pointer by
        
        weekViewPointer += (WEEK_LENGTH * val);
        
        if (weekViewPointer < 0 || weekViewPointer >= $scope.days.length) { //means we need to shift month scope
            curMonth.shiftMonth(val);
            setDays();
            var curMonthNum = curMonth.getMonthNum();
            
            if(val == -1) { //moving back a month
                var lastDayOfScopeMonth = $scope.days[$scope.days.length-1];

                if (lastDayOfScopeMonth.date.getMonth() !== curMonthNum) { //if overlapping week, get second to last week
                    weekViewPointer = $scope.days.length - (2 * WEEK_LENGTH);
                } else { //if no overlapping week, get the last week new scope month
                    weekViewPointer = $scope.days.length - WEEK_LENGTH;
                }
            }
            
            if(val == 1) { //moving forward a month
                var firstDayOfScopeMonth = $scope.days[0];

                if (firstDayOfScopeMonth.date.getMonth() !== curMonthNum) { //if overlapping week, get second week of new month scope
                    weekViewPointer = WEEK_LENGTH;
                } else { //if no overlapping week, get first week of new month scope
                    weekViewPointer = 0;
                }
            }
        
            curMonth.loadEvents().then(function() {
                setDays();
                setWeekViewDays();
            });
        } else {

            setWeekViewDays();

        }

        dayViewPointer = weekViewPointer; //moves dayViewPointer to move with weekViewPointer
    }


// _ _ _ _ _ FUNCTIONS WHICH RETURN INFO TO VIEW FOR DISPLAY PURPOSES_ _ _ _ _ //

    $scope.displayViewDate = function() {
        switch ($scope.view) {
            case 'day':
                var date = $scope.dayViewDay.date;
                var dayName = $scope.DAY_NAMES[date.getDay()];
                var monthName = MONTH_NAMES[date.getMonth()];
                var dateNum = date.getDate();
                var yearNum = date.getFullYear();
                return h.trim(dayName) + ' ' + h.trim(monthName) + ' ' + dateNum + ' ' + yearNum;

            case 'week':
                var firstDay = $scope.weekViewDays[0].date; //first day of the week in currently displayed week
                var lastDay = $scope.weekViewDays[WEEK_LENGTH - 1].date; //last day of displayed week

                var firstDayMonth = MONTH_NAMES[firstDay.getMonth()];
                var firstDayDate = firstDay.getDate();
                var lastDayMonth = MONTH_NAMES[lastDay.getMonth()];
                var lastDayDate = lastDay.getDate();
                return h.trim(firstDayMonth) + ' ' + firstDayDate + ' - ' + h.trim(lastDayMonth) + ' ' + lastDayDate;

            case 'month':
                return MONTH_NAMES[curMonth.getMonthNum()] + ' ' + curMonth.getYear();
        }
    };

    $scope.getWeekViewDayHeader = function(date) {
        var dayName = $scope.DAY_NAMES[date.getDay()];
        var dateNum = date.getDate();
        var monthNum = date.getMonth();
        return h.trim(dayName) + ' ' + h.trim(MONTH_NAMES[monthNum]) + ' ' + dateNum;
    };

    $scope.disableSaveEventBtn = function() {
        var inputs = $scope.eventInput;
        var timeArr = h.convertTimeInputsToRangeArray(inputs);

        if (inputs.name && timeArr[1] > timeArr[0]) return false;
        else return true;
    };

    $scope.calculateHeight = function(time) { //used to style events based on duration in day and week view
        var VERT_PIXELS_PER_HOUR = 46;
        var BORDER_WIDTH = 1;
        var eventLength = time[1] - time[0]; //in hours. 4.6667 = 4 hours and 40 minutes
        var height = eventLength * VERT_PIXELS_PER_HOUR;

        height -= BORDER_WIDTH;

        return height + 'px';
    };

    $scope.assignMargin = function(time) { //used to position events based on start time in day and week view
        var VERT_PIXELS_PER_HOUR = 46;
        var PIXELS_IN_TOP_BAR = 24;
        var BORDER_WIDTH = 1;

        var timeFromTop = time[0] - timeTableStart;
        var pixels = Math.round(timeFromTop * VERT_PIXELS_PER_HOUR);
        
        if ($scope.view == 'week') pixels += PIXELS_IN_TOP_BAR; //for the extra row with day names in week view 

        pixels += BORDER_WIDTH;

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
        if (minutes == '00') return hours + ' ' + AMorPM;
        else return '';
    };

    $scope.getColorFromCategory = function(categoryID) {
        var color = 'black';            
        $scope.categories.forEach(category => {
            if (category._id === categoryID) color = category.color;
        });
        return color;           
    };

    $scope.setBG = function(date) {
        var monthNum = date.getMonth();
        var dateNum = date.getDate();
        var curMonthNum = curMonth.getMonthNum();

        if (monthNum !== curMonthNum) return 'out-of-cur-month';
        else return 'no-style';
    };

    $scope.assignDateNumClass = function(date) {
        var curMonthNum = curMonth.getMonthNum();

        var monthNum = date.getMonth();
        var dateNum = date.getDate();
        var yearNum = date.getFullYear();

        if (dateNum == today.getDate() && monthNum == today.getMonth() && yearNum == today.getFullYear()) return 'current-day';
        if (monthNum !== curMonthNum) return 'out-of-current-month';
        else return 'no-style';
    };

    $scope.disableEdit = function() { //used for an ng-disabled on an edit button
        var inputs = $scope.categoryInput;
        if (inputs.editColor) return false;
        if (inputs.editName) return false;
        return true;
    };


// _ _ _ _ _ FUNCTIONS WHICH ALLOW USER TO INTERFACE WITH FEATURES _ _ _ _ _ //
// _ _ _ _ _ SUCH AS CATEGORY MANAGEMENT AND EVENT CREATION/EDITION _ _ _ _ _ //

    $scope.selectCategory = function(category) {
        if (category == $scope.selectedCategory) {
            $scope.selectedCategory = null;
        } else {
            $scope.selectedCategory = category;
            angular.element('.edit-category-form .colorPicker-picker').css('background', category.color);
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

    $scope.toggleCategoryMenu = function() {
        if (menuIsBeingToggled) return;

        menuIsBeingToggled = true;
        setTimeout(function() {
            menuIsBeingToggled = false;
         }, 1000);

        $scope.categoryInput = {};

        if ($scope.showingCategoryMenu) {
            $scope.showingCategoryMenu = false;
            setTimeout(function() {
                $scope.renderingCategoryMenu = false;
                $scope.$apply();
            }, 1100);
        } else {
            $scope.renderingCategoryMenu = true;
            setTimeout(function() {
                $scope.showingCategoryMenu = true;
                $scope.$apply();
            }, 100);
        }

        if ($scope.selectedCategory) {
            if (!$scope.showingCategoryMenu) angular.element('.colorPicker-picker').css('background', 'white');
            else angular.element('.edit-category-form .colorPicker-picker').css('background', $scope.selectedCategory.color);
        }
    };

    $scope.showEventEditPopup = function(event) {
        $scope.showingEventPopup = true;
        $scope.newOrEdit = 'Edit';
        $scope.eventDate = event.date;
        $scope.eventInput.name = event.name;
        $scope.eventInput.description = event.description;
        $scope.eventInput.category = event.category;
        setTimeSelectValues(event.time[0], event.time[1]);
        eventPointer = event; // will be accessed again from editEvent function
    };

    $scope.showEventCreationPopup = function(day, time) {
        $scope.showingEventPopup = true;
        $scope.newOrEdit = 'New';

        setTimeSelectValues(time);

        dayPointer = day; // dayPointer will be accessed from createEvent function
        var date = day.date;
        $scope.eventDate = $scope.DAY_NAMES[date.getDay()] + ' ' + (date.getMonth()+1) + '/' + date.getDate();
    };

    $scope.closeEventPopup = function() {
        $scope.eventInput = {};
        $scope.showingEventPopup = false;
    };

    $(document).keydown(function(e) { //closes event popup when escape key pressed. using jquery because ng-keypress only works for inputs
        if (e.which == 27) {
            if ($scope.showingEventPopup) {
                $scope.closeEventPopup();
                $scope.$apply();
            }
            if ($scope.showingCategoryMenu) {
                $scope.toggleCategoryMenu();
                $scope.$apply();
            }
        } 
    });


// _ _ _ _ _ CATEGORY CREATE/EDIT/DELETE FUNCTIONS _ _ _ _ _ //
// _ _ _ _ _ LONG BORING HTTP FUNCTIONS _ _ _ _ _ //

    $scope.createCategory = function() {
        var inputs = $scope.categoryInput;

        var successCb = function(res) {
            console.log('Category saved.');
            $http.get('/categories/all/' + user).then(function (res){
                $scope.categoryInput = {};
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
                    color: inputs.color,
                    user: user
                }
        };

        $http(req).then(successCb, errorCb);
    };

    $scope.editCategory = function() {
        var inputs = $scope.categoryInput;
        var id = $scope.selectedCategory._id;
        var successCb = function(res) {
            $scope.selectedCategory = null;
            $scope.categoryInput = {};
            loadCategories().then(loadCalendar);
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
    };

    $scope.deleteCategory = function() {
        var id = $scope.selectedCategory._id;

        var successCb = function(res) {
            $scope.selectedCategory = null;
            loadCategories().then(loadCalendar);
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


// _ _ _ _ _ EVENT CREATE/EDIT/DELETE FUNCTIONS _ _ _ _ _ //
// _ _ _ _ _ LONG BORING HTTP FUNCTIONS _ _ _ _ _ //

    $scope.createOrEditEvent = function() { //gets run on submit from event popup form. 
        if ($scope.newOrEdit == 'New') createEvent();
        if ($scope.newOrEdit == 'Edit') editEvent();
    };

    function editEvent() {
        var inputs = $scope.eventInput;
        var eventDate = eventPointer.date;
        var dayIndex = dateToIndexMap[eventDate];
        var dayOfEvent = $scope.days[dayIndex];

        var collidingEvents = [];

        var time = h.convertTimeInputsToRangeArray(inputs);

        if(time !== eventPointer.time) { // if user changed time of event, then check for time collisions with other events
            dayOfEvent.events.forEach(event => {
                var timeCollision = h.checkTimeCollisions(time, event.time); //returns boolean. true = time collision
                if (timeCollision && event._id != eventPointer._id) {
                    collidingEvents.push(event.name);
                }
            });
        }

        var successCb = function(res) {          
            $scope.eventInput = {}; //resets input fields
            $http.get('/events/date/' + eventDate + '/' + user).then(function (res) {
                $scope.days[dayIndex].events = res.data.sort(function(a, b) {
                    return a.time[0] - b.time[0];
                });
                if ($scope.view == 'day') setDayViewDay();
                if ($scope.view == 'week') setWeekViewDays();
            });
            console.log('Event saved.');
            $scope.showingEventPopup = false;
        };
        var errorCb = function(err) {
            console.log('Save failed.');
        };
        var req = {
            method: 'PUT',
            url:'/events/edit/' + eventPointer._id,
            data: 
                { 
                    name: inputs.name,
                    description: inputs.description,
                    time: time,
                    category: inputs.category
                }
        };

        if (collidingEvents.length > 0) alert('Time collision with: ' + collidingEvents);
        else $http(req).then(successCb, errorCb);
    }
    
    function createEvent() {
        var inputs = $scope.eventInput;
        var eventDate = h.getDateString(dayPointer.date);
        var monthNum = dayPointer.date.getMonth();
        var yearNum = dayPointer.date.getFullYear();
        
        var collidingEvents = [];

        var time = h.convertTimeInputsToRangeArray(inputs);

        dayPointer.events.forEach(event => {
            var timeCollision = h.checkTimeCollisions(time, event.time); //returns boolean. true = time collision
            if (timeCollision) {
                collidingEvents.push(event.name);
            } 
        });

        var successCb = function(res) {          
            $scope.eventInput = {}; //resets input fields
            $http.get('/events/date/' + eventDate + '/' + user).then(function (res) {
                var index = dateToIndexMap[eventDate];
                $scope.days[index].events = res.data.sort(function(a, b) {
                    return a.time[0] - b.time[0];
                });
                if ($scope.view == 'day') setDayViewDay();
                if ($scope.view == 'week') setWeekViewDays();
            });
            console.log('Event saved.');
            $scope.showingEventPopup = false;
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
                    time: time,
                    category: inputs.category,
                    dateObj: dayPointer.date,
                    user: user
                }
        };

        if (collidingEvents.length > 0) alert('Time collision with: ' + collidingEvents);
        else $http(req).then(successCb, errorCb);
    }

    $scope.deleteEvent = function() {
        var eventDate = eventPointer.date;
        var dayIndex = dateToIndexMap[eventDate];

        var successCb = function(res) {
            console.log('Event deleted.');
            $http.get('/events/date/' + eventDate + '/' + user).then(function (res){ //reloads events for that day after deletion
                $scope.days[dayIndex].events = res.data.sort(function(a, b) {
                    return (a.time[0] - b.time[0]);
                });
                setDayViewDay();
            });
        };
        var errorCb = function(err) {
            console.log('Deletion failed.');
        };
        var req = {
            method: 'DELETE',
            url:'/events/' + eventPointer._id
        };
        $http(req).then(successCb, errorCb);
    };

    $scope.changeEventDate = function(draggedEvent, receivingIndex) { //receivingIndex is index of receiving day within $scope.days
        if (!draggedEvent || !receivingIndex) return;

        var originalDate = draggedEvent.date;
        var originalIndex = dateToIndexMap[originalDate];
        var receivingDay = $scope.days[receivingIndex];
        var receivingDate = h.getDateString(receivingDay.date);

        if (receivingDate !== originalDate) {
            var collidingEvents = [];

            receivingDay.events.forEach(event => {
                var timeCollision = h.checkTimeCollisions(draggedEvent.time, event.time); //returns boolean
                if (timeCollision) collidingEvents.push(event.name);
            });

            var successCb = function(res) {          
                $http.get('/events/date/' + originalDate + '/' + user).then(function (res) {
                    $scope.days[originalIndex].events = res.data.sort(function(a, b) {
                        return a.time[0] - b.time[0];
                    });
                });
                $http.get('/events/date/' + receivingDate + '/' + user).then(function (res) {
                    $scope.days[receivingIndex].events = res.data.sort(function(a, b) {
                        return a.time[0] - b.time[0];
                    });
                });
            };

            var errorCb = function(err) {
                console.log('Update failed.');
            };

            var req = {
                method: 'PUT',
                url:'/events/edit/' + draggedEvent._id,
                data: 
                    { 
                        date: receivingDate,
                        dateObj: receivingDay.date
                    }
            };

            if (collidingEvents.length > 0) alert('Time collision with: ' + collidingEvents);
            else $http(req).then(successCb, errorCb);
        }
    };

// _ _ _ _ _ THE LONGEST FUNCTION EVER _ _ _ _ _ //

    function setTimeSelectValues(startTime, endTime) { 
        $scope.hours = ['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
        $scope.minuteStrings = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
        $scope.AMPM = ['AM', 'PM'];

        if ((typeof startTime  === 'number') && (typeof endTime === 'number')) { //in the case that we are editing an existing event
            if (startTime < 12) {
                $scope.eventInput.startAMPM = 'AM';
            } else {
                $scope.eventInput.startAMPM = 'PM';
                startTime -= 12;
            }
            if (endTime < 12) {
                $scope.eventInput.endAMPM = 'AM';
            } else {
                $scope.eventInput.endAMPM = 'PM';
                endTime -= 12;
            }

            var startHour = Math.floor(startTime);
            $scope.eventInput.startHour = $scope.hours[startHour];
            var startMinute = startTime - startHour;
            var startMinuteIndex = Math.round(startMinute * $scope.minuteStrings.length);
            $scope.eventInput.startMinute = $scope.minuteStrings[startMinuteIndex];

            var endHour = Math.floor(endTime);
            $scope.eventInput.endHour = $scope.hours[endHour];
            var endMinute = endTime - endHour;
            var endMinuteIndex = Math.round(endMinute * $scope.minuteStrings.length);
            $scope.eventInput.endMinute = $scope.minuteStrings[endMinuteIndex];

        } else { //in the case that we are creating a new event
            if (typeof startTime === 'number') { //in the case that event creation called from day or week view by clicking on a startTime
                if (startTime < 12) {
                    $scope.eventInput.startAMPM = 'AM';
                } else {
                    $scope.eventInput.startAMPM = 'PM';
                    startTime -= 12;
                }
                var hours = Math.floor(startTime);
                $scope.eventInput.startHour = $scope.hours[hours];
                var minutes = startTime - hours; // will be 0 or .5
                var desiredIndex = Math.round(minutes * $scope.minuteStrings.length); // 0.5 = half hour, 0.5 * 12 = 6, '30' minutes is index 6 in $scope.minuteStrings
                $scope.eventInput.startMinute = $scope.minuteStrings[desiredIndex];
                $scope.eventInput.endMinute = $scope.minuteStrings[desiredIndex]; //sets minutes equal to each other

                if ($scope.eventInput.startHour == '11') { //special cases with 11AM and 11PM
                    if ($scope.eventInput.startAMPM == 'AM') { //if start 11AM, set end time to 12PM
                        $scope.eventInput.endHour = '12';
                        $scope.eventInput.endAMPM = 'PM';
                    }
                    if ($scope.eventInput.startAMPM == 'PM') { //if start 11PM, set end time to 11:55PM
                        $scope.eventInput.endHour = '11';
                        $scope.eventInput.endMinute = '55';
                        $scope.eventInput.endAMPM = 'PM';
                    }
                } else { // all other cases, set endHour to be 1 hour later than startHour and set endAMPM to be same as startAMPM 
                    $scope.eventInput.endAMPM = $scope.eventInput.startAMPM;
                    $scope.eventInput.endHour = $scope.hours[hours + 1];
                }
            } else { //in the case that event creation called from monthview
                $scope.eventInput.startHour = '12';
                $scope.eventInput.startMinute = '00';
                $scope.eventInput.startAMPM = 'PM';
                $scope.eventInput.endHour = '1';
                $scope.eventInput.endMinute = '00';
                $scope.eventInput.endAMPM = 'PM';
            }
        }
    }

// _ _ _ _ _ END OF CONTROLLER _ _ _ _ _ //
}]);
};