const fs = require('fs');
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
