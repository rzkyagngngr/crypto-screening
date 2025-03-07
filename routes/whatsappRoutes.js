const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');

router.post('/send-group-message', whatsappController.sendGroupMessage);
router.post('/schedule-group-message', whatsappController.scheduleGroupMessage);

module.exports = router;