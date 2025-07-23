const express = require('express');
const router = express.Router();
const { saveLeadTimerLog, getAllLeadTimerLogs , getLeadTimerLogsByLead} = require('../controllers/leadTimerLogController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/save', protect, saveLeadTimerLog); 
router.get('/all', protect,admin, getAllLeadTimerLogs); 
router.get('/:leadId', protect, getLeadTimerLogsByLead);

module.exports = router;
        