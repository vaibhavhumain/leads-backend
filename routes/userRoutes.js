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

router.get('/me', protect, getMyProfile);
router.get('/', protect, getAllUsers);
router.get('/:id', protect, getUserById);
router.put('/update-picture', protect, updateProfilePicture);
router.put('/update-password', protect, updatePassword);

module.exports = router;
