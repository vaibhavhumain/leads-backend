const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PauseLogSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    pausedAt: {
      type: Date,
      required: true,
    },
    resumedAt: {
      type: Date,
      default: null,
    },
    pausedDuration: {
      type: Number, 
      default: null,
    },
  },
  {
    timestamps: true, 
  }
);

module.exports = mongoose.model('PauseLog', PauseLogSchema);
