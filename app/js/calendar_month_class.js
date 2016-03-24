var h = require('./static_functions');

var CalendarMonth = function(http, user) {

    //one "calendar month" contains more than just the days in a month. It may also contain extra days from
    //previous month or following month, so that the number of days will be a multiple of 7 and the calendar
    //can maintain a Sunday - Saturday format. 

	var $http = http;
    var user = user;
    var today = new Date(); 
    var curMonthNum = today.getMonth(); //month which calendar is currently displaying. Intializes to current month
    var year = today.getFullYear(); //year which calendar is currently displaying. Initializes to current year
    var indexOfToday; //gets set in renderCalendar
    var monthLengths; //gets set by setMonthLengths function when needed (accounts for leap years)
    var dateToIndexMap = {}; //used to look up an index in $scope.days based on a dateString
    var self = this;

    var days = []; //this array will populate calendar via ng-repeat

    this.renderMonth = () => { //main function. creates between 4 and 6 sunday-saturday weeks, centered around a month, kept in $scope.days array
        indexOfToday = null;
        dateToIndexMap = {}; 
        monthLengths = h.setMonthLengths(year); //sets monthLengths based on year, accounting for leap years
        days = []; 

        var extraDays = h.findExtraDays(year, curMonthNum, monthLengths[curMonthNum]); //returns an object with two properties, both numbers
        
        for(var i=extraDays.beginning; i<monthLengths[curMonthNum] + extraDays.end; i++) {
            var day = new Date(year, curMonthNum, i+1); //Automatic adjustments made by Date Object: April 0 -> March 31, April -1 -> March 30, April 31 -> May 1, etc.
            days.push({date: day, events: []});
            var dateString = h.getDateString(day);
            dateToIndexMap[dateString] = (i - extraDays.beginning);
            if (day.toLocaleDateString() == today.toLocaleDateString()) {
                indexOfToday = (i - extraDays.beginning);
            } 
        }
    }

    this.loadEvents = () => {
        var rangeObj = {
            start: days[0].date,
            end: days[days.length-1].date
        };

        var successCb = function(res) {
            res.data.forEach(event => {
                var index = dateToIndexMap[event.date];
                if (index >= 0 && index < days.length) days[index].events.push(event);
            });
            
            self.sortEvents();
        };

        var errorCb = function(res) {
            console.log('failed');
        };

        var req = {
            method: 'POST',
            url:'/events/range/' + user,
            data: rangeObj
        };

        return $http(req).then(successCb, errorCb);
    };

    this.sortEvents = () => {
    	days.forEach(day => {
            if (day.events.length > 0) {
                day.events.sort(function(a, b) {
                    return (a.time[0] - b.time[0]);
                });
            }
        });
    };

    this.shiftMonth = val => { //val will either be -1 or 1
        curMonthNum += val;
        if (curMonthNum === 12) { //if month is after December, set month back to January and increment year
            year++;
            curMonthNum = 0;
        } else if (curMonthNum === -1) { //if month is before January, set month to December and decrement year
            year--; 
            curMonthNum = 11;
        }
        this.renderMonth();
    };

    this.getDays = () => {
    	return days;
    };

    this.getMonthNum = () => {
    	return curMonthNum;
    };

    this.getYear = () => {
    	return year;
    };

    this.getDateToIndexMap = () => {
    	return dateToIndexMap;
    };

    this.getIndexOfToday = () => {
    	return indexOfToday;
    };
};

module.exports = exports = CalendarMonth;

