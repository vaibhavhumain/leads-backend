const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createEnquiry,
  downloadEnquiryPdf,
  getAllPdfsByLead,
  updateLuxuryEnquiry,   
} = require('../controllers/enquiryController');

router.post('/', protect, createEnquiry);

router.get('/pdf/:id', protect, downloadEnquiryPdf);

router.get('/all-pdfs/:leadId', protect, getAllPdfsByLead);

router.post('/luxury/:enquiryId', protect, updateLuxuryEnquiry);

module.exports = router;
