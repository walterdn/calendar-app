var mongoose = require('mongoose');

var categorySchema = new mongoose.Schema({
	name: String,
	color: String,
	user: String
});

module.exports = mongoose.model('Category', categorySchema);
