// models/Enquiry.js
const mongoose = require('mongoose');

/* ---------- Embedded Schemas for Luxury section ---------- */

const StandardFitmentSchema = new mongoose.Schema(
  {
    key: String,        // e.g. "Front Glass"
    label: String,      // display label
    suggested: String,  // suggested spec (optional)
    choice: String,     // "Suggested" | "Other"
    otherValue: String, // free text when "Other"
  },
  { _id: false }
);

const ExtraCostFitmentSchema = new mongoose.Schema(
  {
    key: String,       // e.g. "EXTRA::AC"
    label: String,     // e.g. "A/C"
    checked: Boolean,  // true if included
    company: String,   // company / description
  },
  { _id: false }
);

const CustomExtraSchema = new mongoose.Schema(
  {
    name: String,  // item name
    desc: String,  // company / description
  },
  { _id: false }
);

/* ---------------------- Main Enquiry ---------------------- */

const enquirySchema = new mongoose.Schema(
  {
    enquiryId: { type: String, required: true, unique: true },

    // Lead/customer basics
    teamMember: String,
    customerName: String,
    companyDetails: String,
    address: String,
    city: String,
    state: String,
    pincode: String,
    customerPhone: String,
    customerEmail: String,

    // High-level enquiry
    busType: String,
    otherBusType: String,
    featureRequirement: String,
    acPreference: String,

    // Chassis
    chassisBought: String,
    chassisPurchaseTime: String,
    chassisCompanyName: String,
    chassisModel: String,
    wheelBase: String,
    tyreSize: String,
    length: String,
    width: String,

    // Seating
    seatingPattern: String,
    numberOfSeats: String,

    // Misc
    additionalNote: String,
    referralSource: String,

    // Business details
    businessTypeOfBuses: String,
    businessNumberOfBuses: Number,
    businessPreviousBodyBuilder: String,
    businessBusesPerYear: Number,
    businessEmployees: Number,
    businessExpertiseArea: String,

    // Personal
    education: String,
    hobbies: String,
    behavior: String,

    // 👇 allow '', null to be stored as undefined so enum doesn't throw
    customerType: {
      type: String,
      enum: ['Amazing', 'Bread winning', 'Convenience', 'Dangerous'],
      set: (v) => (v === '' || v == null ? undefined : v),
    },

    // Luxury form (window / seats / interiors)
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

    // Lists from main form
    optionalFeatures: [String],
    fitmentProvided: [String],

    /* ---------- NEW: Luxury model details ---------- */
    modelName: String, // e.g. "Spider", "Arrow", ...

    // Table of standard fitments (each item has key/label/suggested/choice/otherValue)
    standardFitments: { type: [StandardFitmentSchema], default: [] },

    // Checked items from model-specific optional fitments
    optionalFitmentsSelected: { type: [String], default: [] },

    // Extra-cost fitments with company/description
    extraCostFitments: { type: [ExtraCostFitmentSchema], default: [] },

    // Custom rows user added
    customExtras: { type: [CustomExtraSchema], default: [] },

    /* ---------- Meta ---------- */
    pdfData: Buffer,
    createdAt: { type: Date, default: Date.now },

    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    proposalPdf: { type: Buffer },
  },
  {
    minimize: false, // keep empty objects if you ever store them
    timestamps: false,
  }
);

/* Helpful indexes for your queries */
enquirySchema.index({ lead: 1, createdAt: -1 });
enquirySchema.index({ enquiryId: 1 }, { unique: true });

module.exports = mongoose.model('Enquiry', enquirySchema);
