const Lead = require('../models/Lead');
const Enquiry = require('../models/Enquiry');

exports.createEnquiry = async (req, res) => {
  try {
    const data = req.body;
    const createdBy = data.createdBy || req.user?._id;

    if (!createdBy) {
      return res.status(400).json({ error: '`createdBy` is required' });
    }

    // Save enquiry
    const enquiry = await Enquiry.create(data);

    // Save lead
    await Lead.create({
      leadDetails: {
        clientName: data.customerName,
        phone: data.customerPhone,
        email: data.customerEmail,
      },
      answers: data,
      createdBy, // ✅ fixed
    });

    res.status(200).json({ message: 'Enquiry submitted successfully ✅' });
  } catch (err) {
    console.error('❌ Backend error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};
