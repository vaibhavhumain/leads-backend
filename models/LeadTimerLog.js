const mongoose = require('mongoose');

const leadTimerLogSchema = new mongoose.Schema({
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
  leadName: String,
  stoppedByName: String, 
  stoppedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
  duration: { type: Number, required: true }, 
  startTime: { type: Date, required: true },  
  stopTime: { type: Date, default: Date.now },  
  stoppedAt: { type: Date, default: Date.now }, 

  followUps: [
    {
      date: { type: Date },
      remark: { type: String }
    }
  ],
  notes: [
    {
      text: { type: String },
      createdAt: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });


module.exports = mongoose.models.LeadTimerLog || mongoose.model('LeadTimerLog', leadTimerLogSchema);
