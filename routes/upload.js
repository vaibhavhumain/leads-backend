const express = require('express');
const multer = require('multer');
const { uploadImage } = require('../controllers/uploadController');

const router = express.Router();

const tempUpload = multer({ dest: 'temp/' });

router.post('/upload-image', tempUpload.single('image'), uploadImage);

module.exports = router;
