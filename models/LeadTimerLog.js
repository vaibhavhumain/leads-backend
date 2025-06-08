// models/LeadTimerLog.js
const mongoose = require('mongoose');

const leadTimerLogSchema = new mongoose.Schema({
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
  leadName: String,
  stoppedByName: String, // Human-readable name
  stoppedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // For reference
  duration: { type: Number, required: true }, // in seconds
}, { timestamps: true });

module.exports = mongoose.models.LeadTimerLog || mongoose.model('LeadTimerLog', leadTimerLogSchema);
