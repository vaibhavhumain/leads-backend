// controllers/leadTimerLogController.js
const LeadTimerLog = require('../models/LeadTimerLog');
const Lead = require('../models/Lead');
const notifyAllExceptAdmin = require('../config/createNotifications');

exports.saveLeadTimerLog = async (req, res) => {
  try {
    const userId = req.user.id;
    const { leadId, leadName, stoppedByName, duration } = req.body;

    // Validation
    if (!leadId || !leadName || !stoppedByName || !duration) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    // Create log
    const log = await LeadTimerLog.create({
      lead: leadId,
      leadName,
      stoppedBy: userId,
      stoppedByName,
      duration,
    });

    // 🚩 Send in-app notification
    await notifyAllExceptAdmin(
      `Timer stopped for lead "${leadName}" by ${stoppedByName}. Duration: ${duration}`,
      `/leadDetails?leadId=${leadId}`
    );

    res.status(200).json(log);
  } catch (err) {
    res.status(500).json({ message: 'Error saving timer log', error: err.message });
  }
};

// For admin to get all logs:
exports.getAllLeadTimerLogs = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

    const logs = await LeadTimerLog.find()
      .populate('lead', 'leadDetails.clientName')
      .populate('stoppedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load timer logs', error: err.message });
  }
};
