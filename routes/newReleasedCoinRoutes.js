const express = require('express');
const router = express.Router();
const newReleasedCoinController = require('../controllers/newReleasedCoinController');

router.get('/new-coins-potential', newReleasedCoinController.getNewCoinsPotential);

module.exports = router;