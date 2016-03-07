var mongoose = require('mongoose');

var eventSchema = new mongoose.Schema({
	name: String,
	description: String,		
	date: String,               // March 1 2016 = 3-1-2016
	yearmonth: String,
	time: String,
	category: String
});

module.exports = mongoose.model('Event', eventSchema);
