const express = require('express');
const router = express.Router();
const { saveAnswersForLead } = require('../controllers/answerController');

router.post('/save-all', saveAnswersForLead);

module.exports = router;
