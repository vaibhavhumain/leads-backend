const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Get all users (for lead assignment)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, '_id name email role');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id, '_id name email role');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Get logged-in user's profile
exports.getMyProfile = (req, res) => {
  console.log('Inside getMyProfile');
  console.log('User attached to req:', req.user);
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized: No user in request' });
  }
  res.json(req.user);
};


// Update profile picture (assuming front-end sends `profileImage` as a URL)
exports.updateProfilePicture = async (req, res) => {
  const { profileImage } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.profileImage = profileImage;
    await user.save();

    res.json({ message: 'Profile picture updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile picture', error: error.message });
  }
};

// Update password (currentPassword + newPassword required)
exports.updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Current password is incorrect' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating password', error: error.message });
  }
};
