const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createEnquiry,
  downloadEnquiryPdf,
  getAllPdfsByLead,
  saveLuxuryDetails   // ✅ ADD THIS
} = require('../controllers/enquiryController');

router.post('/', protect, createEnquiry);

router.get('/pdf/:id', protect, downloadEnquiryPdf);

router.get('/all-pdfs/:leadId', protect, getAllPdfsByLead);

router.post('/luxury/:leadId', protect, saveLuxuryDetails);

module.exports = router;
