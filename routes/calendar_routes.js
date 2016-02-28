var express = require('express');
var bodyParser = require('body-parser').json();
var Calendar = require(__dirname + '/../models/someSchema');
var handleError = require(__dirname + '/../lib/handle_server_error');

var calendarRouter = module.exports = express.Router();
calendarRouter.use(bodyParser);

calendarRouter.post('/new', bodyParser, function(req, res) {

});

calendarRouter.get('/fetch/:code', function (req, res) {

});