const express = require('express');
const router = express.Router();
const { savePauseLog, getAllPauseLogs } = require('../controllers/pauseLogController');
const { protect ,admin } = require('../middleware/authMiddleware'); // Adjust this path if different

router.post('/save', protect, savePauseLog);
router.get('/all', protect, admin, getAllPauseLogs);

module.exports = router;
