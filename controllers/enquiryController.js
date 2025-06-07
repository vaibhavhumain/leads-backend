const Lead = require('../models/Lead');
const Enquiry = require('../models/Enquiry');
const generateEnquiryPdf = require('../config/generateEnquiryPdf');

exports.createEnquiry = async (req, res) => {
  try {
    const data = req.body;
    const createdBy = data.createdBy || req.user?._id;

    if (!createdBy) {
      return res.status(400).json({ error: '`createdBy` is required' });
    }

    // Step 1: Check if lead already exists for this phone
    let lead = await Lead.findOne({ 'leadDetails.contact': data.customerPhone });

    // Step 2: If not found, create a new lead
    if (!lead) {
      lead = await Lead.create({
        leadDetails: {
          clientName: data.customerName,
          contact: data.customerPhone,
          email: data.customerEmail,
        },
        answers: data,
        createdBy,
      });
    }

    // Step 3: Create new enquiry linked to that lead
    const enquiry = await Enquiry.create({
      ...data,
      lead: lead._id,
    });

    // Step 4: Generate PDF and attach it
    const pdfBuffer = await generateEnquiryPdf(enquiry);
    enquiry.pdfData = pdfBuffer;
    await enquiry.save();

    // Step 5: Respond to frontend
    res.status(200).json({
      message: 'Enquiry submitted successfully ✅',
      enquiryId: enquiry._id,
    });
  } catch (err) {
    console.error('❌ Backend error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// ✅ NEW: Controller to serve the stored PDF
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
      pdfUrl: `/api/enquiry/pdf/${e._id}`,
    })));
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};
