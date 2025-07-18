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
  getAllActivities,
  deleteLeadByUser,
  updateCompanyName,
  updateLocation,
  updatePrimaryContact,
  filterLeads,
  addNote,
  getFollowUpDates,
  moveLeadToDead,
  getDeadLeads,
} = require('../controllers/leadController');
const { protect , admin } = require('../middleware/authMiddleware');

const router = express.Router();

// ✅ Specific routes first
router.get('/my-leads', protect, getMyLeads);
router.get('/all', protect, getAllLeads);
router.get('/forwarded-to-me', protect, getForwardedLeadsToMe);
router.get('/search', protect, searchLeadsByPhone);
router.get('/:leadId/actionPlans', protect, getActionPlans);
router.get('/:leadId/activities',protect , getActivities);
router.get('/all-activities',protect,admin,getAllActivities);

// ✅ Lead creation & update
router.post('/create', protect, createLead);
router.post('/forward', protect, forwardLead);
router.post('/followup', protect, addFollowUp);
router.post('/bulk', protect, bulkCreateLeads);
router.post('/saveActionPlan', protect, saveActionPlan);
router.post('/:id/add-contact', protect, addContact);
router.post('/:leadId/activities',protect , addActivity);
router.post('/:leadId/notes', protect, addNote);
router.post('/move-to-dead/:id',protect,moveLeadToDead);

// ✅ Updates
router.put('/:id/email', protect, updateEmail);
router.put('/:id/client-name', protect, updateClientName);
router.put('/:id/status', protect, updateLeadStatus);
router.put('/:id/connection-status', protect, updateConnectionStatus);
router.put('/:id/company-name', protect, updateCompanyName);
router.put('/:id/location', protect, updateLocation);
router.put('/:id/primary-contact', updatePrimaryContact);


// ✅ Deletion
router.delete('/deleteByUser/:id', protect, deleteLeadByUser);
router.delete('/:id', protect, deleteLead);
router.delete('/', protect, deleteAllLeads);
 
// ✅ General get (keep last)
router.get('/filter',protect,filterLeads);
router.get('/followup-dates', protect, getFollowUpDates);
router.get('/:id', protect, getLeadById);
router.get('/', protect, getLeads);
router.get('/dead-leads', protect, getDeadLeads);

module.exports = router;
