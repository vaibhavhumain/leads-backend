const express = require('express');
const router = express.Router();
const {protect} = require('../middleware/authMiddleware')
const { createEnquiry, downloadEnquiryPdf , getAllPdfsByLead} = require('../controllers/enquiryController');

router.post('/enquiry', createEnquiry);

router.get('/enquiry/pdf/:id',protect, downloadEnquiryPdf);

router.get('/enquiry/all-pdfs/:leadId', protect , getAllPdfsByLead);


module.exports = router;
