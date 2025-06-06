const express = require('express');
const { sendWhatsAppImage } = require('../controllers/sendWhatsAppController');

const router = express.Router();

// POST /api/send/send-whatsapp
router.post('/send-whatsapp', sendWhatsAppImage);

module.exports = router;
