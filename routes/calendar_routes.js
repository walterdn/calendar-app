var express = require('express');
var bodyParser = require('body-parser').json();
var Event = require(__dirname + '/../models/eventSchema');
var handleError = require(__dirname + '/../lib/handle_server_error');

var calendarRouter = module.exports = exports = express.Router();
calendarRouter.use(bodyParser);

calendarRouter.get('/events/all', function(req, res) {
  Event.find({}, function(err, data) {
    if (err) return handleError(err, res);

    res.json(data);
  });
});

calendarRouter.get('/events/:date', function(req, res) {
  Event.find({date: req.params.date}, function(err, data) {
    if (err) return handleError(err, res);

    res.json(data);
  });
});

calendarRouter.post('/newevent', bodyParser, function(req, res) {
  var newEvent = new Event(req.body);
  newEvent.save(function(err, data) {
    if (err) return handleError(err, res);

    res.json(data);
  });
});

calendarRouter.delete('/events/:id', function(req, res) {
  Event.remove({_id: req.params.id}, function(err) {
    if (err) return handleError(err, res);

    res.json({msg: 'Event deleted.'});
  });
});