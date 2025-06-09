const express = require('express');
const router = express.Router();
const { saveLeadTimerLog, getAllLeadTimerLogs } = require('../controllers/leadTimerLogController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/save', protect, saveLeadTimerLog); // Called when timer stops
router.get('/all', protect,admin, getAllLeadTimerLogs); // Admin gets all logs

module.exports = router;
        