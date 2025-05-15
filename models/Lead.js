const mongoose = require('mongoose');
const followUpSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  notes: { type: String, required: true },
});

const forwardedToSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  forwardedAt: { type: Date, default: Date.now },
});

const leadSchema = new mongoose.Schema(
  {
    leadDetails: {
      name: { type: String, required: true },
      phone: { type: String },      
      company: { type: String },
      
    },
    isFrozen: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['New', 'In Progress', 'Followed Up', 'Converted', 'Closed', 'Not Interested'],
      default: 'New',
    },
    followUps: [followUpSchema], 
    forwardedTo: forwardedToSchema,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Lead', leadSchema);
