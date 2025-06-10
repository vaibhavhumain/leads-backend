const express = require('express');
const { getNotifications, markRead } = require('../controllers/notificationController');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect,getNotifications); 
router.post('/mark-read/:id',protect, markRead); 

module.exports = router;
