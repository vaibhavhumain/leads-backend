const Question = require('../models/Question');

exports.addMultipleQuestions = async (req, res) => {
  try {
    const questions = req.body.questions;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Questions array is required' });
    }

    const savedQuestions = await Question.insertMany(questions);
    res.status(201).json(savedQuestions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save questions', details: err.message });
  }
};


exports.getAllQuestions = async (req, res) => {
  try {
    const questions = await Question.find({});
    res.status(200).json(questions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch questions', details: err.message });
  }
};
