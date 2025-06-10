const express = require('express');
const { getNotifications, markRead } = require('../controllers/notificationController');
const router = express.Router();


router.get('/', getNotifications); 
router.post('/mark-read/:id', markRead); 

module.exports = router;
