const { updateConnectionStatus } = require('../controllers/leadController');
const { bulkCreateLeads } = require('../controllers/leadController');
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
} = require('../controllers/leadController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// ✅ Create a new lead (createdBy set from token)
router.post('/create', protect, createLead);

// ✅ Forward a lead to another user
router.post('/forward', protect, forwardLead);

// ✅ Update lead email
router.put('/:id/email', protect, updateEmail);

// ✅ Add a follow-up to a lead
router.post('/followup', protect, addFollowUp);

// ✅ Bulk lead import
router.post('/bulk', protect, bulkCreateLeads);

// ✅ Get all leads (Admin or team-based access)
router.get('/', protect, getLeads);

// ✅ Delete a lead
router.delete('/:id', protect, deleteLead);

// ✅ Update lead details
router.put('/:id/client-name', protect, updateClientName);

// ✅ Save action plan for a lead
router.post('/saveActionPlan', protect, saveActionPlan);

// ✅ Get action plans for a lead
router.get('/:leadId/actionPlans', protect, getActionPlans);

// ✅ Delete all leads (Admin only)
router.delete('/', protect, deleteAllLeads);

// ✅ Get leads created by the logged-in user
router.get('/my-leads', protect, getMyLeads);

// ✅ Get all leads
router.get('/all', protect, getAllLeads);

// ✅ Get leads forwarded to the logged-in user
router.get('/forwarded-to-me', protect, getForwardedLeadsToMe);

// ✅ Search leads by phone number
router.get('/search', protect, searchLeadsByPhone);

// ✅ Get a single lead by its ID
router.get('/:id', protect, getLeadById);

// ✅ Update lead status
router.put('/:id/status', protect, updateLeadStatus);

// ✅ Update lead connection status
router.put('/:id/connection-status', protect, updateConnectionStatus);

module.exports = router;
