const express = require('express');
const router = express.Router();
const { createEnquiry, downloadEnquiryPdf , getAllPdfsByLead} = require('../controllers/enquiryController');

router.post('/enquiry', createEnquiry);

router.get('/enquiry/pdf/:id', downloadEnquiryPdf);

router.get('/enquiry/all-pdfs/:leadId', getAllPdfsByLead);


module.exports = router;
