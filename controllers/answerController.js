const Lead = require('../models/Lead');

exports.submitLeadAnswers = async (req, res) => {
  try {
    const { leadId, answers } = req.body;

    if (!leadId || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'leadId and answers array are required' });
    }

    const lead = await Lead.findByIdAndUpdate(
      leadId,
      { $set: { answers } },
      { new: true }
    );

    res.status(200).json({ message: 'Answers submitted successfully', lead });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit answers', details: err.message });
  }
};
