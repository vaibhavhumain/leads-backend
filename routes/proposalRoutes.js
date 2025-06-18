const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { generateProposalForLead , downloadProposalPdf } = require('../controllers/proposalController');  

router.get('/generate/:leadId', protect, generateProposalForLead);
router.get('/download/:id', protect, downloadProposalPdf); // New route
 

module.exports = router;
