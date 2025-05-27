const Question = require("../models/Question");
const Lead = require("../models/Lead");

exports.saveQuestionsAndAnswers = async (req, res) => {
  try {
    const { clientName, answers, predefinedQuestions } = req.body;

    if (!clientName || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Client Name and answers are required' });
    }

    for (const question of predefinedQuestions) {
      const existing = await Question.findOne({ text: question.text });
      if (!existing) await Question.create(question);
    }

    const lead = await Lead.findOneAndUpdate(
      { 'leadDetails.clientName': clientName },
      { $set: { answers } },
      { new: true }
    );

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found with given client name' });
    }

    res.status(200).json({ message: 'Questions saved and answers submitted ✅', lead });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process', details: err.message });
  }
};
