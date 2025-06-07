// models/PauseLog.js
const mongoose = require('mongoose');

const pauseLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pausedAt: { type: Date, required: true },
  resumedAt: Date,
  pausedDuration: Number, // in seconds
}, { timestamps: true });

module.exports = mongoose.models.PauseLog || mongoose.model('PauseLog', pauseLogSchema);
