var express = require('express');
var app = express();
var mongoose = require('mongoose');
var port = process.env.PORT || 3000;
var calendarRouter = require(__dirname + '/routes/calendar_routes');

process.env.APP_SECRET = process.env.APP_SECRET || 'hello'; 

mongoose.connect(process.env.MONGOLAB_URI || 'mongodb://localhost/calendar_dev');

app.use(express.static(__dirname + '/build'));

app.use(calendarRouter);

app.listen(port, function() {
  console.log('Server up.');
});

