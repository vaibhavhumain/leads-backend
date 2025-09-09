const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createEnquiry,
  downloadEnquiryExcel,   // ✅ Excel
  getAllExcelsByLead,     // ✅ Excel
  saveLuxuryDetails,
} = require('../controllers/enquiryController');

// Create new enquiry
router.post('/', protect, createEnquiry);

// Excel download (new)
router.get('/excel/:id', protect, downloadEnquiryExcel);

// Get all enquiry excels by lead
router.get('/all-excels/:leadId', protect, getAllExcelsByLead);

// Save luxury details
router.post('/luxury/:leadId', protect, saveLuxuryDetails);

module.exports = router;
