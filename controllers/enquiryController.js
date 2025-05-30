const Enquiry = require('../models/Enquiry');

//Create a new enquiry
exports.createEnquiry = async (req, res) => {
  try {
    const enquiry = new Enquiry(req.body);
    const savedEnquiry = await enquiry.save();
    res.status(201).json(savedEnquiry);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save enquiry', details: err.message });
  }
};

//Get all enquiries
exports.getAllEnquiries = async (req, res) => {
  try {
    const enquiries = await Enquiry.find().sort({ createdAt: -1 });
    res.status(200).json(enquiries);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch enquiries', details: err.message });
  }
};

//Get a single enquiry by ID
exports.getEnquiryById = async (req, res) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id);
    if (!enquiry) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }
    res.status(200).json(enquiry);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch enquiry', details: err.message });
  }
};

//Delete an enquiry by ID
exports.deleteEnquiryById = async (req, res) => {
  try {
    const deleted = await Enquiry.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }
    res.status(200).json({ message: 'Enquiry deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete enquiry', details: err.message });
  }
};
