// models/LeadTimerLog.js
const mongoose = require('mongoose');

const leadTimerLogSchema = new mongoose.Schema({
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
  leadName: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Who created the lead
  stoppedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Who stopped the timer
  stoppedByName: String,
  startTime: { type: Date, required: true },
  pauseTimes: [{ start: Date, end: Date }], // if you want to capture pauses
  stopTime: { type: Date, required: true },
  totalSeconds: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.models.LeadTimerLog || mongoose.model('LeadTimerLog', leadTimerLogSchema);
