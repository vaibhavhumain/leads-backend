const express = require('express');
const {
  createLead,
  forwardLead,
  addFollowUp,
  getMyLeads,
  getLeads,
  getAllLeads,
  getLeadById,
  updateLeadStatus,
  getForwardedLeadsToMe,
  searchLeadsByPhone,
  deleteLead,
  deleteAllLeads,
  updateClientName,
  updateEmail,
  saveActionPlan,
  getActionPlans,
  updateConnectionStatus,
  bulkCreateLeads,
  addContact,
  addActivity,
  getActivities,
} = require('../controllers/leadController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// ✅ Specific routes first
router.get('/my-leads', protect, getMyLeads);
router.get('/all', protect, getAllLeads);
router.get('/forwarded-to-me', protect, getForwardedLeadsToMe);
router.get('/search', protect, searchLeadsByPhone);
router.get('/:leadId/actionPlans', protect, getActionPlans);
router.get('/:leadId/activities',protect , getActivities);


// ✅ Lead creation & update
router.post('/create', protect, createLead);
router.post('/forward', protect, forwardLead);
router.post('/followup', protect, addFollowUp);
router.post('/bulk', protect, bulkCreateLeads);
router.post('/saveActionPlan', protect, saveActionPlan);
router.post('/:id/add-contact', protect, addContact);
router.post('/:leadId/activities',protect , addActivity);

// ✅ Updates
router.put('/:id/email', protect, updateEmail);
router.put('/:id/client-name', protect, updateClientName);
router.put('/:id/status', protect, updateLeadStatus);
router.put('/:id/connection-status', protect, updateConnectionStatus);


// ✅ Deletion
router.delete('/:id', protect, deleteLead);
router.delete('/', protect, deleteAllLeads);

// ✅ General get (keep last)
router.get('/', protect, getLeads);
router.get('/:id', protect, getLeadById); // <-- must be last to avoid shadowing others

module.exports = router;
