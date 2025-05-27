// models/Question.js
const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  text: String,
  type: String,
  options: [String],
});

module.exports = mongoose.model('Question', questionSchema);
