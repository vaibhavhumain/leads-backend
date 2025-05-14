const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  getMyProfile,
  updateProfilePicture,
  updatePassword,
} = require('../controllers/userController');

const { protect } = require('../middleware/authMiddleware');

// ✅ Add this route
router.get('/profile/me', protect, (req, res) => {
  console.log('User profile request received');
  getMyProfile(req, res);
});

// Other routes
router.get('/', protect, getAllUsers);
router.get('/:id', protect, getUserById);
router.put('/update-picture', protect, updateProfilePicture);
router.put('/update-password', protect, updatePassword);

module.exports = router;
