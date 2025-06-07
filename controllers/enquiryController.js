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

    const enquiry = await Enquiry.create(data);

    await Lead.create({
      leadDetails: {
        clientName: data.customerName,
        phone: data.customerPhone,
        email: data.customerEmail,
      },
      answers: data,
      createdBy,
    });

    const pdfBuffer = await generateEnquiryPdf(enquiry);
    enquiry.pdfData = pdfBuffer;
    await enquiry.save();

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
