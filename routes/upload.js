const express = require('express');
const multer = require('multer');
const { uploadImage , getAllImages} = require('../controllers/uploadController');

const router = express.Router();

const tempUpload = multer({ dest: 'temp/' });

router.post('/upload-image', tempUpload.single('image'), uploadImage);
router.get('/all-images', getAllImages);

module.exports = router;
