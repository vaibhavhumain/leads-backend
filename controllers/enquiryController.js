const Lead = require('../models/Lead');
const Enquiry = require('../models/Enquiry');
const generateEnquiryPdf = require('../config/generateEnquiryPdf');
const notifyAllExceptAdmin = require('../config/createNotifications');

exports.createEnquiry = async (req, res) => {
  try {
    const data = req.body;
    const createdBy = data.createdBy || req.user?._id;

    if (!createdBy) {
      return res.status(400).json({ error: '`createdBy` is required' });
    }

    const leadId = data.leadId;
    if (!leadId) {
      return res.status(400).json({ error: 'leadId is required! No lead will be created from enquiry form.' });
    }

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found. Please re-import or refresh leads.' });
    }

    // Create new enquiry linked to that lead
    const enquiry = await Enquiry.create({
      enquiryId: `ENQ-${Date.now()}`,
      ...data,
      lead: lead._id,
    });

    // Generate PDF and attach it
    const pdfBuffer = await generateEnquiryPdf(enquiry);
    enquiry.pdfData = pdfBuffer;
    await enquiry.save();

    // ✅ Send in-app notification to all users except admin
    await notifyAllExceptAdmin(
      `A new enquiry (${enquiry.enquiryId}) has been created for lead "${lead.clientName || lead.name}" by ${req.user?.name || 'a user'}.`,
      `/leadDetails?leadId=${lead._id}`
    );

    // Respond to frontend
    res.status(200).json({
      message: 'Enquiry submitted successfully ✅',
      enquiryId: enquiry._id,
      leadId: lead._id,
    });
  } catch (err) {
    console.error('❌ Backend error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// ✅ Controller to serve the stored PDF
exports.downloadEnquiryPdf = async (req, res) => {
  try {
    const enquiry = await Enquiry.findOne({ enquiryId: req.params.id }); 

    if (!enquiry || !enquiry.pdfData) {
      return res.status(404).json({ error: 'PDF not found' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${enquiry.enquiryId}.pdf`);
    res.send(enquiry.pdfData);
  } catch (err) {
    console.error('❌ Download error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

exports.getAllPdfsByLead = async (req, res) => {
  try {
    const enquiries = await Enquiry.find({ lead: req.params.leadId });

    if (!enquiries.length) return res.status(404).json({ error: 'No enquiries found' });

    res.status(200).json(enquiries.map(e => ({
      enquiryId: e.enquiryId,
      createdAt: e.createdAt,
      pdfUrl: `/api/enquiry/pdf/${e.enquiryId}`,
    })));
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};
