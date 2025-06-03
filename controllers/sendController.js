const path = require('path');
const fs = require('fs');

exports.handleImageUpload = async (req, res) => {
  const imageFile = req.file;

  if (!imageFile) {
    return res.status(400).json({ success: false, error: 'No image file uploaded' });
  }

  try {
    const publicPath = `/uploads/${imageFile.filename}`; // This will be publicly accessible
    res.json({ success: true, message: 'Image uploaded successfully', path: publicPath });
  } catch (err) {
    console.error('Error handling image upload:', err);
    res.status(500).json({ success: false, error: 'Image upload failed' });
  }
};
