var mongoose = require('mongoose');

var someSchema = new mongoose.Schema({
	something: String,
	somethingElse: String
});

module.exports = mongoose.model('Something', someSchema);
