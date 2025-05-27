const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');

router.post('/questions/bulk', questionController.addMultipleQuestions);
router.get('/questions', questionController.getAllQuestions);

module.exports = router;
