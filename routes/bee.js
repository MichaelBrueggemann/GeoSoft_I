let express = require('express');
let router = express.Router();

/* GET home page. */
router.get('/bee', function(req, res, next) {
  res.render('bee');
})

module.exports = router;
