const fs = require('fs');
const cloudinary = require('../config/cloudinaryConfig'); 
const path = require('path');

const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

exports.uploadImage = (req, res) => {
  const file = req.file;
  if (!file) {
    console.error('No file uploaded');
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  const ext = path.extname(file.originalname);
  const finalPath = path.join(uploadDir, file.filename + ext);

  fs.rename(file.path, finalPath, (err) => {
    if (err) {
      console.error('Error moving file:', err);
      return res.status(500).json({ success: false, error: 'Failed to move file' });
    }

    console.log(`File successfully uploaded to ${finalPath}`);
    res.json({
      success: true,
      path: `/uploads/${file.filename + ext}`,
    });
  });
};

exports.getAllImages = (req, res) => {
  const uploadDir = path.join(__dirname, '..', 'public', 'uploads');

  fs.readdir(uploadDir, (err, files) => {
    if (err) {
      console.error('Error reading uploads directory:', err);
      return res.status(500).json({ success: false, error: 'Unable to read uploads' });
    }

    const imagePaths = files.map((file) => `/uploads/${file}`);
    res.status(200).json({ success: true, images: imagePaths });
  });
};

exports.uploadMultipleImages = async (req, res) => {
  const files = req.files;
  if (!files || files.length === 0) {
    return res.status(400).json({ success: false, error: 'No files uploaded' });
  }

  const uploadedUrls = [];

  for (let file of files) {
    try {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'gobind_gallery', 
      });
      uploadedUrls.push(result.secure_url);
    } catch (err) {
      console.error('Cloudinary upload failed:', err);
    }
  }

  if (uploadedUrls.length === 0) {
    return res.status(500).json({ success: false, error: 'All uploads failed' });
  }

  res.status(200).json({ success: true, images: uploadedUrls });
};