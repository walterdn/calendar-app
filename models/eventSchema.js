var mongoose = require('mongoose');

var eventSchema = new mongoose.Schema({
	name: String,			// max length 15
	description: String,	// optional notes	
	date: String,           // will look like: 3-1-2016 // represents: March 1 2016
	time: Array, 			// will look like: [9.5, 18] // represents: event beginning at 9:30 AM and ending 6:00 PM
	category: String,		// will be the id of a category db object
	dateObj: Date 			// will be a JS date obj
});

module.exports = mongoose.model('Event', eventSchema);
