// controllers/pauseLogController.js

const PauseLog = require('../models/PauseLog');

// Save a pause or resume action
exports.savePauseLog = async (req, res) => {
  try {
    const userId = req.user.id;
    const { pausedAt, resumedAt, pausedDuration } = req.body;

    if (!pausedAt && !resumedAt) {
      return res.status(400).json({ message: 'pausedAt or resumedAt is required' });
    }

    let log;
    if (resumedAt) {
      // Resume: update the last open pause log
      log = await PauseLog.findOneAndUpdate(
        { user: userId, resumedAt: null }, // Find the most recent un-resumed pause
        { resumedAt, pausedDuration },
        { new: true }
      );
      if (!log) {
        return res.status(404).json({ message: 'No matching pause log to resume' });
      }
    } else {
      // Pause: create a new log
      log = await PauseLog.create({ user: userId, pausedAt });
    }

    res.status(200).json(log);
  } catch (err) {
    console.error('PauseLog error:', err);
    res.status(500).json({ message: 'Error saving pause log', error: err.message });
  }
};

// Admin: Get all pause logs (with user info)
exports.getAllPauseLogs = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

    const logs = await PauseLog.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load pause logs', error: err.message });
  }
};

// User: Get own pause logs
exports.getMyPauseLogs = async (req, res) => {
  try {
    const userId = req.user.id;
    const logs = await PauseLog.find({ user: userId })
      .sort({ createdAt: -1 });

    res.status(200).json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load pause logs', error: err.message });
  }
};
