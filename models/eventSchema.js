var mongoose = require('mongoose');

var eventSchema = new mongoose.Schema({
	name: String,
	description: String,
	date: String,
	time: String
});

module.exports = mongoose.model('Event', eventSchema);
