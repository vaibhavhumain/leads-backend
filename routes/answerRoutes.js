const express = require('express');
const router = express.Router();
const { saveQuestionsAndAnswers } = require('../controllers/answerController');

router.post('/save-all', saveQuestionsAndAnswers);

module.exports = router;
