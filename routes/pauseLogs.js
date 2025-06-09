const express = require('express');
const router = express.Router();
const pauseLogController = require('../controllers/pauseLogController');
const { requireAuth } = require('../middleware/authMiddleware');

router.post('/save', requireAuth, pauseLogController.savePauseLog);
router.get('/all', requireAuth, pauseLogController.getAllPauseLogs);
router.get('/mine', requireAuth, pauseLogController.getMyPauseLogs);

module.exports = router;
