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
  pdfData: Buffer, 
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Enquiry', enquirySchema);
