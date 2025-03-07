const express = require('express');
const router = express.Router();
const icoCoinController = require('../controllers/icoCoinController');

router.get('/ico-potential', icoCoinController.getIcoCoinsPotential);

module.exports = router;