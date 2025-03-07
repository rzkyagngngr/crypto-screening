const express = require('express');
const router = express.Router();
const coinController = require('../controllers/coinController');

router.get('/top-50-coins', coinController.getTop50Coins);
router.post('/save-top-50-coins', coinController.saveTop50Coins);
router.get('/screened-coins', coinController.getScreenedCoins);
router.post('/screen-top-50-coins', coinController.screenTop50CoinsOnDemand);

module.exports = router;