const mongoose = require('mongoose');
const followUpSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  notes: { type: String, required: true },
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // ✅ added
});

const forwardedToSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  forwardedAt: { type: Date, default: Date.now },
});

const leadSchema = new mongoose.Schema(
  {
    leadDetails: {
  companyName: { type: String },
  location: { type: String },
  clientName: { type: String, default: '' }, 
  source: { type: String }, 
  email: { type: String, default: '' },
  contacts: {
  type: [
    {
      number: { type: String }, 
      label: { type: String, default: "Primary" }
    }
  ],
  required: false,
  default: undefined,
}
},

  isFrozen: { type: Boolean, default: false },
  status: {
  type: String,
  enum: ['Hot', 'Warm', 'Cold'],
  default: 'Cold', 
},
actionPlans: [
  {
    text: { type: String, required: true },
    date: { type: Date, default: Date.now },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }
],

activities: [
  {
    type: {
      type: String,
      enum: ['factory_visit', 'in_person_meeting'],
      required: true
    },
    date: { type: Date, required: true },
    conductedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    location: { type: String }, 
    remarks: { type: String },
    outcome: { type: String }
  }
],


connectionStatus: {
  type: String,
  enum: ['Connected', 'Not Connected'],
  default: 'Not Connected',
},
    remarks: { type: String },  
    date: { type: Date }, 
    remarksHistory: [
  {
    remarks: String,
    date: Date,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }
],
answers: [
  {
    question: String,
    answer: String
  }
],


    followUps: [followUpSchema], 
    forwardedTo: forwardedToSchema,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const clientProfilingResponseSchema = new mongoose.Schema({
  question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  answer: mongoose.Schema.Types.Mixed, 
});

leadSchema.add({
  clientProfilingResponses: [clientProfilingResponseSchema],
});

module.exports = mongoose.model('Lead', leadSchema);
