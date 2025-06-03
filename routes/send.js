  const express = require('express');
  const multer = require('multer');
  const path = require('path');
  const fs = require('fs');
  const { handleImageUpload } = require('../controllers/sendController');

  const router = express.Router();

  // Ensure the public/uploads directory exists
  const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Multer config to save file in public/uploads/
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const uniqueName = Date.now() + '-' + file.originalname;
      cb(null, uniqueName);
    }
  });
  const upload = multer({ storage });

  router.post('/upload-image', upload.single('image'), handleImageUpload);

  module.exports = router;
