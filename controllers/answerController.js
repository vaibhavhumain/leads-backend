const Lead = require('../models/Lead');
const Question = require('../models/Question');

exports.saveQuestionsAndAnswers = async (req, res) => {
  try {
    const { leadId, answers, predefinedQuestions } = req.body;

    if (!leadId || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Lead ID and answers are required' });
    }

    for (const question of predefinedQuestions) {
      const existing = await Question.findOne({ text: question.text });
      if (!existing) await Question.create(question);
    }

    const lead = await Lead.findByIdAndUpdate(
      leadId,
      { $set: { answers } },
      { new: true }
    );

    res.status(200).json({ message: 'Questions saved and answers submitted ✅', lead });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process', details: err.message });
  }
};
