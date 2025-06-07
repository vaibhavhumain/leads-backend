const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema({
  enquiryId: { type: String, required: true, unique: true },
  customerName: String,
  customerPhone: String,
  customerEmail: String,
  busType: String,
  featureRequirement: String,
  chassisBought: String,
  chassisCompanyName: String,
  seatingPattern: String,
  numberOfSeats: String,
  optionalFeatures: [String],
  fitmentProvided: [String],
  businessDetails: {
    typeOfBuses: String,
    numberOfBuses: Number,
    previousBodyBuilder: String,
    busesPerYear: Number,
    employees: Number,
    expertiseArea: String,
  },
  education: String,
  hobbies: String,
  behavior: String,
  customerType: {
    type: String,
    enum: ['Amazing', 'Bread winning', 'Convenience', 'Dangerous'],
  },

  pdfData: Buffer, 
  createdAt: { type: Date, default: Date.now },
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
});

module.exports = mongoose.model('Enquiry', enquirySchema);
