module.exports = function(app) {
app.controller('CalendarController', ['$scope', '$http', function($scope, $http) {

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

// _ _ _ _ _ MINOR GLOBAL VARIABLES _ _ _ _ _ //

    var today = new Date(); 
    var indexOfToday; //gets set in renderCalendar
    var monthLengths; //gets set by setMonthLengths function when needed (accounts for leap years)
    var dayPointer; //gets set by showEventCreationPopup, then accessed again in createEvent should the user save an event
    var eventPointer; //gets set by showEventEditPopup, accessed again in editEvent

// _ _ _ _ _ MAJOR GLOBAL VARIABLES _ _ _ _ _ //

    var curMonthNum = today.getMonth(); //month which calendar is currently displaying. Intializes to current month
    var year = today.getFullYear(); //year which calendar is currently displaying. Initializes to current year
    var dateToIndexMap = {}; //used to look up an index in $scope.days based on a dateString
    var dayViewPointer; //index number of dayViewDay in $scope.days
    var weekViewPointer = 0; //index number of first Sunday of weekview in $scope.days
    var timeTableStart = 9; //9AM by default

// _ _ _ _ _ MAIN FUNCTIONS _ _ _ _ _ //

    function renderCalendar() { //main function. creates between 4 and 6 sunday-saturday weeks, centered around a month, kept in $scope.days array
        dateToIndexMap = {};
        setMonthLengths(); //sets global var monthLengths based on year, accounting for leap years
        $scope.days = []; //this array will populate each day in calendar via ng-repeat
        var extraDays = findExtraDays(); //returns an object with two properties, both numbers
        
        for(var i=extraDays.beginning; i<monthLengths[curMonthNum] + extraDays.end; i++) {
            var day = new Date(year, curMonthNum, i+1); //Automatic adjustments made by Date Object: April 0 -> March 31, April -1 -> March 30, April 31 -> May 1, etc.
            $scope.days.push({date: day, events: []});
            var dateString = getDateString(day);
            dateToIndexMap[dateString] = (i - extraDays.beginning);
            if (day.toLocaleDateString() == today.toLocaleDateString()) {
                indexOfToday = (i - extraDays.beginning);
                setWeekViewPointer(indexOfToday);
            } 
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
            $scope.days.forEach(day => {
                if (day.events.length > 0) {
                    day.events.sort(function(a, b) {
                        return (a.time[0] - b.time[0]);
                    });
                }
            });

            if ($scope.view == 'week') setWeekViewDays();
            if ($scope.view == 'day') setDayViewDay();
        });
    }

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

    $scope.editCategory = function() {
        var inputs = $scope.categoryInput;
        var id = $scope.selectedCategory._id;
        var successCb = function(res) {
            $scope.selectedCategory = null;
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
    };

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

    $scope.deleteEvent = function() {
        var eventDate = eventPointer.date;
        var dayIndex = dateToIndexMap[eventDate];

        var successCb = function(res) {
            console.log('Event deleted.');
            $http.get('/events/date/' + eventDate).then(function (res){ //reloads events for that day after deletion
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

    $scope.scroll = function(val) { //val will either be -1 or 1. -1 = scrolling back, +1 = scrolling forward
        switch ($scope.view) {
            case 'day':
               dayViewPointer += val;
                if (dayViewPointer < 0) { 
                    if ($scope.days[0].date.getMonth() == curMonthNum) { //if first of month was sunday, get last day of prev month
                        shiftMonthScope(val);
                        dayViewPointer = $scope.days.length - 1;
                    } else { //else get last day of second to last week of prev month
                        shiftMonthScope(val);
                        dayViewPointer = $scope.days.length - (1 + WEEK_LENGTH);
                    }
                }

                if (dayViewPointer == $scope.days.length) {
                    if ($scope.days[$scope.days.length-1].date.getMonth() == curMonthNum) { //if last of month was saturday, get first day of next month
                        shiftMonthScope(val);
                        dayViewPointer = 0;
                    } else { // if last of month wasn't a saturday, get first day of second week of next month
                        shiftMonthScope(val);
                        dayViewPointer = WEEK_LENGTH;
                    }
                }

                setWeekViewPointer(dayViewPointer); 
                setDayViewDay();
                break;

            case 'week':
                weekViewPointer += (7 * val);
                if (weekViewPointer < 0) { //going back a month
                    if ($scope.days[0].date.getMonth() == curMonthNum) { //if first of month was sunday, show last week of prev month
                        shiftMonthScope(val);
                        weekViewPointer = $scope.days.length - WEEK_LENGTH;
                    } else { //if first of month wasn't a sunday, show second to last week of prev month because the last week was already being displayed
                        shiftMonthScope(val);
                        weekViewPointer = $scope.days.length - (2 * WEEK_LENGTH);
                    }
                }
                if (weekViewPointer == $scope.days.length) {
                    if ($scope.days[$scope.days.length-1].date.getMonth() == curMonthNum) { //if last of month was saturday, show first week of next month
                        shiftMonthScope(val);
                        weekViewPointer = 0;
                    } else { //if last of month wasn't a saturday, show second week of next month because first week was already being displayed
                        shiftMonthScope(val);
                        weekViewPointer = WEEK_LENGTH;
                    }
                }
                dayViewPointer = weekViewPointer;
                setWeekViewDays();
                break;

            case 'month':
                shiftMonthScope(val);
                weekViewPointer = 0;
                if (year == today.getFullYear()) { //conditions under which we want to set weekViewPointer to number other than 0
                    if (curMonthNum == today.getMonth()) setWeekViewPointer(indexOfToday); //if current month, set weekViewPointer to current week
                    if (curMonthNum < today.getMonth()) weekViewPointer = $scope.days.length - WEEK_LENGTH; 
                } 
                break;
        }
    };

    function shiftMonthScope(val) { //val will either be -1 or 1
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

    $scope.changeEventDate = function(draggedEvent, receivingIndex) {
        var originalDate = draggedEvent.date;
        var originalIndex = dateToIndexMap[originalDate];
        var receivingDay = $scope.days[receivingIndex];
        var receivingDate = getDateString(receivingDay.date);
        var receivingYearMonth = receivingDay.date.getFullYear() + '-' + receivingDay.date.getMonth();

        if (receivingDate !== originalDate) {
            var collidingEvents = [];

            receivingDay.events.forEach(event => {
                var timeCollision = checkTimeCollisions(draggedEvent.time, event.time);
                if (timeCollision) collidingEvents.push(event.name);
            });

            var successCb = function(res) {          
                $http.get('/events/date/' + originalDate).then(function (res) {
                    $scope.days[originalIndex].events = res.data.sort(function(a, b) {
                        return a.time[0] - b.time[0];
                    });
                });
                $http.get('/events/date/' + receivingDate).then(function (res) {
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
                        yearmonth: receivingYearMonth
                    }
            };

            if (collidingEvents.length > 0) alert('Time collision with: ' + collidingEvents);
            else $http(req).then(successCb, errorCb);
        }
    };

    $scope.createOrEditEvent = function() {
        if ($scope.newOrEdit == 'New') createEvent();
        if ($scope.newOrEdit == 'Edit') editEvent();
    };

    function editEvent() {
        var inputs = $scope.eventInput;
        var eventDate = eventPointer.date;
        var dayIndex = dateToIndexMap[eventDate];
        var dayOfEvent = $scope.days[dayIndex];

        var collidingEvents = [];

        var time = convertTimeInputsToRangeArray(inputs);

        if(time !== eventPointer.time) { // if user changed time of event, then check for time collisions with other events
            dayOfEvent.events.forEach(event => {
                var timeCollision = checkTimeCollisions(time, event.time); //returns boolean. true = time collision
                if (timeCollision && event._id != eventPointer._id) {
                    collidingEvents.push(event.name);
                }
            });
        }

        var successCb = function(res) {          
            $scope.eventInput = {}; //resets input fields
            $http.get('/events/date/' + eventDate).then(function (res) {
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
        var eventDate = getDateString(dayPointer.date);
        var monthNum = dayPointer.date.getMonth();
        var yearNum = dayPointer.date.getFullYear();
        var yearMonthString = yearNum + '-' + monthNum;
        
        var collidingEvents = [];

        var time = convertTimeInputsToRangeArray(inputs);

        dayPointer.events.forEach(event => {
            var timeCollision = checkTimeCollisions(time, event.time); //returns boolean. true = time collision
            if (timeCollision) {
                collidingEvents.push(event.name);
            } 
        });

        var successCb = function(res) {          
            $scope.eventInput = {}; //resets input fields
            $http.get('/events/date/' + eventDate).then(function (res) {
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
                    yearmonth: yearMonthString,
                    time: time,
                    category: inputs.category
                }
        };

        if (collidingEvents.length > 0) alert('Time collision with: ' + collidingEvents);
        else $http(req).then(successCb, errorCb);
    }

    function convertTimeInputsToRangeArray(inputs) {
        var MIN_PER_HOUR = 60;

        var startHour = Number(inputs.startHour);
        startHour = startHour % 12; //if hour is 12, hour becomes 0
        var endHour = Number(inputs.endHour);
        endHour = endHour % 12;
        var startTime = startHour + Number(inputs.startMinute/MIN_PER_HOUR);
        if (inputs.startAMPM == 'PM') startTime += 12;
        var endTime = endHour + Number(inputs.endMinute/MIN_PER_HOUR); 
        if (inputs.endAMPM == 'PM') endTime += 12;
        var timeArr = [Number(parseFloat(startTime).toFixed(4)), Number(parseFloat(endTime).toFixed(4))];

        return timeArr;
    }

    $scope.openDayView = function(day) {
        if (day) { //if openDayView called on a specific day
            var dateString = getDateString(day.date);
            dayViewPointer = dateToIndexMap[dateString];
        } else { //if called not on a specific day, just by clicking the day view button
            if ($scope.view == 'month') {
                if (curMonthNum == today.getMonth() && year == today.getFullYear()) dayViewPointer = indexOfToday;
                else {
                    dayViewPointer = 0;
                    while ($scope.days[dayViewPointer].date.getMonth() !== curMonthNum) dayViewPointer++;                    
                }
            }
            if ($scope.view == 'week') dayViewPointer = weekViewPointer;
        }
        setWeekViewPointer(dayViewPointer);
        $scope.view='day';
        setDayViewDay();
    };

    function setWeekViewPointer(index) { //parameter is index of a day within $scope.days. this method helps weekViewPointer move with dayViewPointer
        var remainder = index % 7;
        var multipleOfSeven = index - remainder;
        weekViewPointer = multipleOfSeven; //keeping it multiple of seven so that weekview maintains sunday to saturday format
    }

    $scope.openWeekView = function() {
        $scope.view = 'week';
        setWeekViewDays();
    };

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

    function setDayViewDay() {
        $scope.dayViewDay = null;
        $scope.dayViewDay = {
            date: $scope.days[dayViewPointer].date,
            events: $scope.days[dayViewPointer].events
        };
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

// _ _ _ _ _ HELPER FUNCTIONS _ _ _ _ _ //

    $scope.getWeekViewDayHeader = function(date) {
        var dayName = $scope.DAY_NAMES[date.getDay()];
        var dateNum = date.getDate();
        var monthNum = date.getMonth();
        return trim(dayName) + ' ' + trim(MONTH_NAMES[monthNum]) + ' ' + dateNum;
    };

    $scope.disableSaveEventBtn = function() {
        var inputs = $scope.eventInput;
        var timeArr = convertTimeInputsToRangeArray(inputs);

        if (inputs.name && timeArr[1] > timeArr[0]) return false;
        else return true;
    };

    function checkTimeCollisions(timeArr1, timeArr2) {
        var startTime1 = timeArr1[0];
        var startTime2 = timeArr2[0];
        var endTime1 = timeArr1[1];
        var endTime2 = timeArr2[1];

        if (startTime1 == startTime2) return true; // true means time collisions exist
        if (startTime1 < startTime2) return (endTime1 > startTime2); 
        if (startTime1 > startTime2) return (startTime1 < endTime2);
    }


    $scope.openMonthView = function() {
        $scope.view = 'month';
    };

    $scope.calculateHeight = function(time) {
        var VERT_PIXELS_PER_HOUR = 46;
        var BORDER_WIDTH = 1;
        var eventLength = time[1] - time[0]; //in hours. 4.6667 = 4 hours and 40 minutes
        var height = eventLength * VERT_PIXELS_PER_HOUR;

        height -= BORDER_WIDTH;

        return height + 'px';
    };

    $scope.assignMargin = function(time) {
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
        else return ' ';
    };

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
            if (category._id === categoryID) color = category.color;
        });
        return color;           
    };

    $scope.toggleCategoryMenu = function() {
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

    $scope.setBG = function(date) {
        var monthNum = date.getMonth();
        var dateNum = date.getDate();

        if (monthNum !== curMonthNum) return 'out-of-cur-month';
        else return 'no-style';
    };

    $scope.assignDateNumClass = function(date) {
        var monthNum = date.getMonth();
        var dateNum = date.getDate();
        var yearNum = date.getFullYear();

        if (dateNum == today.getDate() && monthNum == today.getMonth() && yearNum == today.getFullYear()) return 'current-day';
        if (monthNum !== curMonthNum) return 'out-of-current-month';
        else return 'no-style';
    }

    $scope.onPageLoad = function() { //runs on init. 
        angular.element('#color1').colorPicker();
        angular.element('#color2').colorPicker();
        loadCategories(); //renders calendar after loading categories
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
            var startMinuteIndex = Math.round(startMinute * 12);
            $scope.eventInput.startMinute = $scope.minuteStrings[startMinuteIndex];

            var endHour = Math.floor(endTime);
            $scope.eventInput.endHour = $scope.hours[endHour];
            var endMinute = endTime - endHour;
            var endMinuteIndex = Math.round(endMinute * 12);
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
                var desiredIndex = Math.round(minutes * 12); // 0.5 = half hour, 0.5 * 12 = 6, '30' minutes is index 6 in $scope.minuteStrings
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


    $scope.closeEventPopup = function() {
        $scope.eventInput = {};
        $scope.showingEventPopup = false;
    };

    $scope.displayViewDate = function() {
        switch ($scope.view) {
            case 'day':
                var date = $scope.dayViewDay.date;
                var dayName = $scope.DAY_NAMES[date.getDay()];
                var monthName = MONTH_NAMES[date.getMonth()];
                var dateNum = date.getDate();
                var yearNum = date.getFullYear();
                return trim(dayName) + ' ' + trim(monthName) + ' ' + dateNum + ' ' + yearNum;

            case 'week':
                var firstDay = $scope.weekViewDays[0].date; //first day of the week in currently displayed week
                var lastDay = $scope.weekViewDays[WEEK_LENGTH - 1].date; //last day of displayed week

                var firstDayMonth = MONTH_NAMES[firstDay.getMonth()];
                var firstDayDate = firstDay.getDate();
                var lastDayMonth = MONTH_NAMES[lastDay.getMonth()];
                var lastDayDate = lastDay.getDate();
                return trim(firstDayMonth) + ' ' + firstDayDate + ' - ' + trim(lastDayMonth) + ' ' + lastDayDate;

            case 'month':
                return MONTH_NAMES[curMonthNum] + ' ' + year;
        }
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
        var daysToAddToStart = -1 * whichDayIsFirst; //renderCalendar function initializes its for loop at this negative number (or zero)

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