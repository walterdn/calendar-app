var express = require('express');
var bodyParser = require('body-parser').json();
var Event = require(__dirname + '/../models/eventSchema');
var Category = require(__dirname + '/../models/categorySchema');
var handleError = require(__dirname + '/../lib/handle_server_error');

var calendarRouter = module.exports = exports = express.Router();
calendarRouter.use(bodyParser);

calendarRouter.get('/events/all', function(req, res) {
  Event.find({}, function(err, data) {
    if (err) return handleError(err, res);

    res.json(data);
  });
});

calendarRouter.get('/events/date/:date', function(req, res) {
  Event.find({date: req.params.date}, function(err, data) {
    if (err) return handleError(err, res);

    res.json(data);
  });
});

calendarRouter.post('/events/range', bodyParser, function(req, res) {
  var rangeObj = req.body;
  var startDate = rangeObj.start;
  var endDate = rangeObj.end;

  Event.find({dateObj : {$gte: startDate, $lte: endDate}}, function(err, data) {
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

calendarRouter.post('/newcategory', bodyParser, function(req, res) {
  var newCategory = new Category(req.body);
  newCategory.save(function(err, data) {
    if (err) return handleError(err, res);

    res.json(data);
  });
});

calendarRouter.get('/categories/all', function(req, res) {
  Category.find({}, function(err, data) {
    if (err) return handleError(err, res);

    res.json(data);
  });
});

calendarRouter.delete('/categories/:id', function(req, res) {
  Category.remove({_id: req.params.id}, function(err) {
    if (err) return handleError(err, res);

    res.json({msg: 'Category deleted.'});
  });
});

calendarRouter.put('/categories/edit/:id', bodyParser, function (req, res) {
  var categoryData = req.body;
  delete categoryData._id;
  Category.update({_id: req.params.id}, categoryData, function (err) {
    if (err) return handleError(err, res); 

    res.json({msg: 'Category modified.'});
  });
});

calendarRouter.put('/events/edit/:id', bodyParser, function (req, res) {
  var eventData = req.body;
  delete eventData._id;
  Event.update({_id: req.params.id}, eventData, function (err) {
    if (err) return handleError(err, res); 

    res.json({msg: 'Event modified.'});
  });
});