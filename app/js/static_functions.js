var helper = {

    setMonthLengths :	function(year) {
		if(year % 4 === 0) return [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        else return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
	},

	trim : function(string) {
		if (string.length > 3) return string.substring(0, 3);
        else return string;
	},

	getDateString : function(date) {
		var dateString = date.toLocaleDateString(); //March 1 2016 -> 3/1/2016 
        dateString = dateString.replace(/\//g, '-'); //replaces slashes with hyphens. 3-1-2016
        return dateString;
	},

	findExtraDays : function(year, month, monthLength) {  //finds how many days to add to end and beginning of calendar to maintain sunday to saturday grid format
        var firstDayOfMonth = new Date(year, month, 1);
        var whichDayIsFirst = firstDayOfMonth.getDay(); //this variable will be a number. if first of month is a Sunday, it will be 0. If monday, it will be 1.
        var daysToAddToStart = -1 * whichDayIsFirst; //renderCalendar function initializes its for loop at this negative number (or zero)

        var lastDayOfMonth = new Date(year, month, monthLength);
        var whichDayIsLast = lastDayOfMonth.getDay();
        var daysToAddToEnd = 6 - whichDayIsLast;
        return {beginning: daysToAddToStart, end: daysToAddToEnd};   
	},

	convertTimeInputsToRangeArray : function(inputs) {
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
	},

	checkTimeCollisions : function(timeArr1, timeArr2) {
        var startTime1 = timeArr1[0];
        var startTime2 = timeArr2[0];
        var endTime1 = timeArr1[1];
        var endTime2 = timeArr2[1];

        if (startTime1 == startTime2) return true; // true means time collisions exist
        if (startTime1 < startTime2) return (endTime1 > startTime2); 
        if (startTime1 > startTime2) return (startTime1 < endTime2);
	},

};

module.exports = exports = helper;
