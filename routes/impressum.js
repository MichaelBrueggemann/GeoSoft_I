let express = require('express');
let router = express.Router();

/* GET Impressum. */
router.get('/', function(req, res, next) {
  res.render('impressum', { title: 'Impressum' });
});

module.exports = router;