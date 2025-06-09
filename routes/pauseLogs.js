const express = require('express');
const router = express.Router();
const pauseLogController = require('../controllers/pauseLogController');
const { protect } = require('../middleware/authMiddleware');

router.post('/save', protect, pauseLogController.savePauseLog);
router.get('/all', protect, pauseLogController.getAllPauseLogs);
router.get('/mine', protect, pauseLogController.getMyPauseLogs);

module.exports = router;
