const express = require('express');
const multer = require('multer');
const { uploadMultipleImages, getAllImages } = require('../controllers/uploadController');

const router = express.Router();

const tempUpload = multer({ dest: 'temp/' }); // Temporarily store files before Cloudinary upload

router.post('/upload-images', tempUpload.array('images', 10), uploadMultipleImages);
router.get('/all-images', getAllImages); // you can keep this as-is or modify later

module.exports = router;
