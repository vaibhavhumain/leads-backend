const express = require('express');
const router = express.Router();
const { createEnquiry, downloadEnquiryPdf } = require('../controllers/enquiryController');

router.post('/enquiry', createEnquiry);

router.get('/enquiry/pdf/:id', downloadEnquiryPdf);

module.exports = router;
