// controllers/notificationController.js
const Notification = require('../models/Notification');

exports.getNotifications = async (req, res) => {
  const userId = req.user._id;
  const notifications = await Notification.find({ user: userId }).sort({ createdAt: -1 });
  res.json(notifications);
};

exports.markRead = async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { read: true });
  res.json({ message: 'Notification marked as read' });
};
