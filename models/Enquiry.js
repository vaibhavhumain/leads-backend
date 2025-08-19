const mongoose = require('mongoose');

const StandardFitmentSchema = new mongoose.Schema(
  {
    key: String,          // e.g. "Front Glass"
    label: String,        // display label (can mirror key)
    suggested: String,    // suggested spec text (optional)
    choice: String,       // "Suggested" | "Other"
    otherValue: String,   // free text when "Other"
  },
  { _id: false }
);

const ExtraCostFitmentSchema = new mongoose.Schema(
  {
    key: String,          // e.g. "EXTRA::AC"
    label: String,        // e.g. "A/C"
    checked: Boolean,     // true if included
    company: String,      // company/description
  },
  { _id: false }
);

const CustomExtraSchema = new mongoose.Schema(
  {
    name: String,         // item name
    desc: String,         // company/description
  },
  { _id: false }
);

const enquirySchema = new mongoose.Schema(
  {
    enquiryId: { type: String, required: true, unique: true },

    // --- Existing fields ---
    teamMember: String,
    customerName: String,
    companyDetails: String,
    address: String,
    city: String,
    state: String,
    pincode: String,
    customerPhone: String,
    customerEmail: String,
    busType: String,
    otherBusType: String,
    featureRequirement: String,
    acPreference: String,
    chassisBought: String,
    chassisPurchaseTime: String,
    chassisCompanyName: String,
    chassisModel: String,
    wheelBase: String,
    tyreSize: String,
    length: String,
    width: String,
    seatingPattern: String,
    numberOfSeats: String,
    additionalNote: String,
    referralSource: String,

    businessTypeOfBuses: String,
    businessNumberOfBuses: Number,
    businessPreviousBodyBuilder: String,
    businessBusesPerYear: Number,
    businessEmployees: Number,
    businessExpertiseArea: String,

    education: String,
    hobbies: String,
    behavior: String,
    customerType: {
      type: String,
      enum: ['Amazing', 'Bread winning', 'Convenience', 'Dangerous'],
    },

    windowType: String,
    requiredNoEachSide: String,
    tintOfShades: String,
    otherTint: String,
    totalSeats: String,
    seatType: String,
    seatBelt: String,
    seatBeltType: String,
    seatMaterial: String,
    curtain: String,
    flooringType: String,
    passengerDoors: String,
    passengerDoorPosition: String,
    doorType: String,
    roofCarrier: String,
    diggyType: String,
    sideLuggageReq: String,
    diggyFlooring: String,
    sideLadder: String,
    helperFootStep: String,
    rearBackJaal: String,
    cabinType: String,
    specificRequirement: String,
    suggestedModel: String,

    optionalFeatures: [String],
    fitmentProvided: [String],

    // --- NEW: Luxury model details ---
    modelName: String,                                   // e.g. "Spider", "Arrow"...
    standardFitments: { type: [StandardFitmentSchema], default: [] },
    optionalFitmentsSelected: { type: [String], default: [] },
    extraCostFitments: { type: [ExtraCostFitmentSchema], default: [] },
    customExtras: { type: [CustomExtraSchema], default: [] },

    // --- Meta ---
    pdfData: Buffer,
    createdAt: { type: Date, default: Date.now },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    proposalPdf: { type: Buffer },
  },
  {
    minimize: false,  // keeps empty objects/arrays if you ever send them
    timestamps: false // you already have createdAt; set true if you also want updatedAt
  }
);

module.exports = mongoose.model('Enquiry', enquirySchema);
