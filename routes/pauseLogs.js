const express = require('express');
const router = express.Router();
const { savePauseLog, getAllPauseLogs } = require('../controllers/pauseLogController');
const { protect } = require('../middleware/authMiddleware'); // Adjust this path if different

router.post('/save', protect, savePauseLog);
router.get('/all', protect, getAllPauseLogs);

module.exports = router;
