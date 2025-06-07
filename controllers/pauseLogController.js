const PauseLog = require('../models/PauseLog');
const User = require('../models/User');

// ✅ Save pause/resume info - SINGLE EXPORT
exports.savePauseLog = async (req, res) => {
  try {
    const userId = req.user.id;
    const { pausedAt, resumedAt, pausedDuration } = req.body;

    if (!pausedAt) return res.status(400).json({ message: 'pausedAt is required' });

    let log;
    if (resumedAt) {
      log = await PauseLog.findOneAndUpdate(
        { user: userId, resumedAt: null },
        { resumedAt, pausedDuration },
        { new: true }
      );

      if (!log) {
        return res.status(404).json({ message: 'No matching pause log to resume' });
      }
    } else {
      log = await PauseLog.create({ user: userId, pausedAt });
    }

    res.status(200).json(log);
  } catch (err) {
    console.error('PauseLog error:', err.message);
    res.status(500).json({ message: 'Error saving pause log', error: err.message });
  }
};

// ✅ Get all pause logs (admin only)
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
