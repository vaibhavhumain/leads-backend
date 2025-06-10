// utils/createNotifications.js
const Notification = require('../models/Notification');
const User = require('../models/User');

async function notifyAllExceptAdmin(message, link = null) {
  const users = await User.find({ role: { $ne: 'admin' } });

  if (!users.length) return;

  const notifications = users.map(user => ({
    user: user._id,
    message,
    link,
  }));

  await Notification.insertMany(notifications);
}

module.exports = notifyAllExceptAdmin;
