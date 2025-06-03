const Lead = require('../models/Lead');

exports.saveAnswersForLead = async (req, res) => {
  try {
    const { clientName, answers } = req.body;

    if (!clientName || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Client Name and answers are required' });
    }

    const lead = await Lead.findOneAndUpdate(
  { 'leadDetails.clientName': clientName },
  { $set: { answers } },
  { new: true, upsert: true }  
);

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found with given client name' });
    }

    res.status(200).json({ message: 'Answers saved successfully ✅', lead });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save answers', details: err.message });
  }
};
