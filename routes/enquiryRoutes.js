const express = require('express');
const router = express.Router();
const enquiryController = require('../controllers/enquiryController');

router.post('/', enquiryController.createEnquiry);
router.get('/', enquiryController.getAllEnquiries);
router.get('/:id', enquiryController.getEnquiryById);
router.delete('/:id', enquiryController.deleteEnquiryById);

module.exports = router;
