const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  type: { type: String, enum: ['text', 'number', 'boolean', 'select'], default: 'text' },
  options: [String],
});

module.exports = mongoose.model('Question', questionSchema);
