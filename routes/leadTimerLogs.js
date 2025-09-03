const express = require('express');
const router = express.Router();
const { 
  saveLeadTimerLog, 
  getAllLeadTimerLogs, 
  getLeadTimerLogsByLead,
  getLeadTimerLogsByUser
} = require('../controllers/leadTimerLogController');
const { protect, admin } = require('../middleware/authMiddleware');

// ✅ Save a new log
router.post('/save', protect, saveLeadTimerLog);

// ✅ Admin: get all logs
router.get('/all', protect, admin, getAllLeadTimerLogs);

// ✅ Get logs by user
router.get('/user/:userId', protect, getLeadTimerLogsByUser);

// ✅ Get logs by lead
router.get('/:leadId', protect, getLeadTimerLogsByLead);

module.exports = router;
