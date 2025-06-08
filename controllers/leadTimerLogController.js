// controllers/leadTimerLogController.js
const LeadTimerLog = require('../models/LeadTimerLog');
const Lead = require('../models/Lead');
const User = require('../models/User');

exports.saveLeadTimerLog = async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    const { leadId, startTime, stopTime, totalSeconds, pauseTimes = [] } = req.body;
    if (!leadId || !startTime || !stopTime || typeof totalSeconds !== 'number') {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    const lead = await Lead.findById(leadId).populate('createdBy');
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    const user = await User.findById(userId);

    const log = await LeadTimerLog.create({
      lead: leadId,
      leadName: lead.leadDetails?.clientName || 'N/A',
      createdBy: lead.createdBy?._id,
      stoppedBy: userId,
      stoppedByName: user.name,
      startTime,
      stopTime,
      pauseTimes,
      totalSeconds,
    });

    res.status(200).json({ message: 'Timer log saved', log });
  } catch (err) {
    res.status(500).json({ message: 'Failed to save timer log', error: err.message });
  }
};

exports.getAllLeadTimerLogs = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

    const logs = await LeadTimerLog.find()
      .populate('lead', 'leadDetails')
      .populate('createdBy', 'name')
      .populate('stoppedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch logs', error: err.message });
  }
};
