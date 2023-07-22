const EXPRESS = require('express');
const ROUTER = EXPRESS.Router();

/* GET Routenverwaltung. */
ROUTER.get('/', function(_req, res, _next) {
  res.render('stations', { title: 'Stationsverwaltung' });
});

module.exports = ROUTER;