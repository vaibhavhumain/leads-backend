const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema({
  businessDetails: {
    businessName: String,
    designation: String,
    typeOfBusesInFleet: [String],
    numberOfBusesInFleet: Number,
    previousBusBodyBuilder: String,
    annualBusManufactureCount: Number,
    numberOfEmployees: Number,
    areaOfExpertise: String,
  },

  personalTraits: {
    education: String,
    hobbies: [String],
    behaviour: String,
  },

  customerType: {
    amazing: Boolean,
    breadWinning: Boolean,
    convenience: Boolean,
    dangerous: Boolean,
  },

  requirements: {
    required: Boolean,
  },

  busDetails: {
    typeOfBus: {
      type: String,
      enum: ['passenger', 'route', 'tourist', 'sleeper', 'school', 'staff', 'others'],
    },
    features: {
      type: String,
      enum: ['ordinary', 'semi deluxe', 'luxury'],
    },
    acType: {
      type: String,
      enum: ['AC', 'Non AC'],
    },
    hasBoughtChassis: Boolean,
    chassisPurchasePlan: {
      type: String,
      enum: ['7 days', '15 days', 'within a month'],
    },
    chassisExpectedTime: String,
    chassisCompanyName: String,
    chassisModel: String,
    wheelBase: String,
    tyreSize: String,
    length: String,
  },

  seating: {
    windowType: {
      type: String,
      enum: ['sliding glass', 'pack glass', 'pack slider glass'],
    },
    totalSeats: Number,
    seatingPattern: {
      type: String,
      enum: ['3*2', '2*2', '2*1'],
    },
    seatType: {
      type: String,
      enum: ['b class', 'high back', 'push back'],
    },
    seatBelt: {
      hasBelt: Boolean,
      type: {
        type: String,
        enum: ['3 pin', '2 pin'],
      },
    },
    seatMaterial: {
      type: String,
      enum: ['rexin', 'fabric', 'jaquard'],
    },
    curtain: {
      type: String,
      enum: ['normal', 'roller'],
    },
    flooring: {
      type: String,
      enum: ['flat floor', 'gallery floor'],
    },
    passengerDoors: {
      count: {
        type: Number,
        enum: [1, 2],
      },
      position: {
        type: String,
        enum: ['front', 'rear', 'both'],
      },
      doorType: {
        type: String,
        enum: ['inswing', 'outswing'],
      },
    },
  },

  luggageAndStorage: {
    roofCarrier: {
      type: String,
      enum: ['half', 'full'],
    },
    diggyType: {
      type: String,
      enum: ['belly diggy (HIGHDECK)', 'normal diggy'],
    },
    sideLuggageRequirement: String,
    diggyFlooring: {
      type: String,
      enum: ['chaquad plate', 'carpet mat', 'other'],
    },
    sideLadder: Boolean,
    helperFootStep: Boolean,
    rearBackJal: Boolean,
    driverCabin: {
      type: String,
      enum: ['full cabin', 'half cabin', 'without cabin'],
    },
  },

  additionalRequirements: {
    specificRequirements: String,
    suggestedModel: {
      type: String,
      enum: ['spider', 'hymer', 'kasper', 'arrow', 'victor', 'tourista'],
    },
  },

  optionalFitments: {
    providedByCustomer: [String], 
    providedByGC: {
      type: [String],
      default: [
        'wipper motor',
        'fan',
        'digital seat number',
        '3 pin socket',
        'curtain',
        'normal roof hatch in driver cabin',
      ],
    },
  },

  answers: [
  {
    question: { type: String, required: true },
    answer: { type: mongoose.Schema.Types.Mixed, required: true },
  }
],

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Enquiry', enquirySchema);
