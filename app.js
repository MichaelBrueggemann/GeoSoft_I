let createError = require('http-errors');
let express = require('express');
let path = require('path');
let cookieParser = require('cookie-parser');
let logger = require('morgan');

let beeRouter = require('./routes/bee');
let stationsRouter = require('./routes/stations_route');
let tourRouter = require('./routes/tour_route');
let DB_apiRouter = require('./routes/APIs/Database_API');
let Routing_apiRouter = require('./routes/APIs/Routing_API');
let impressumRouter = require('./routes/impressum');

let app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


app.use('/', beeRouter);
app.use('/api', DB_apiRouter);
app.use('/api/routing', Routing_apiRouter);
app.use('/stationsverwaltung', stationsRouter)
app.use('/tourverwaltung', tourRouter);
app.use('/impressum', impressumRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


module.exports = app;
