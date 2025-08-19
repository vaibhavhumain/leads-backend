const Lead = require('../models/Lead');
const Enquiry = require('../models/Enquiry');
const generateEnquiryPdf = require('../config/generateEnquiryPdf');
const notifyAllExceptAdmin = require('../config/createNotifications');
const mongoose = require("mongoose");

// server-side enquiryId generator
function generateEnquiryId(userName) {
  const initials = userName ? userName.substring(0, 3).toUpperCase() : "USR";
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `GC-${initials}-${yyyy}${mm}${dd}${hh}${min}${ss}`;
}

// sanitize incoming payload to avoid validation errors
function sanitizePayload(data) {
  const numberFields = [
    'businessNumberOfBuses',
    'businessBusesPerYear',
    'businessEmployees',
    'numberOfSeats',
    'totalSeats',
  ];

  const out = { ...data };

  // never accept enquiryId from the client
  delete out.enquiryId;

  // drop empty strings / null / undefined
  Object.keys(out).forEach((k) => {
    if (out[k] === '' || out[k] === null || out[k] === undefined) {
      delete out[k];
    }
  });

  // coerce number fields; if NaN, drop them
  numberFields.forEach((k) => {
    if (out[k] !== undefined) {
      const n = Number(out[k]);
      if (Number.isNaN(n)) delete out[k];
      else out[k] = n;
    }
  });

  // if customerType is empty, drop it to avoid enum error
  if (!out.customerType) delete out.customerType;

  return out;
}

exports.createEnquiry = async (req, res) => {
  try {
    // base auth + lead checks
    const createdBy = req.body.createdBy || req.user?._id;
    if (!createdBy) {
      return res.status(400).json({ error: '`createdBy` is required' });
    }

    const leadId = req.body.leadId;
    if (!leadId) {
      return res.status(400).json({ error: 'leadId is required! No lead will be created from enquiry form.' });
    }

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found. Please re-import or refresh leads.' });
    }

    // sanitize user input
    const clean = sanitizePayload(req.body);

    // generate server enquiryId (server source of truth)
    const enquiryId = generateEnquiryId(req.user?.name);

    // IMPORTANT: put enquiryId LAST so client can't overwrite it
    const enquiry = await Enquiry.create({
      ...clean,
      lead: lead._id,
      createdBy: req.user._id,
      enquiryId,
    });

    // generate + attach PDF
    const pdfBuffer = await generateEnquiryPdf(enquiry);
    enquiry.pdfData = pdfBuffer;
    await enquiry.save();

    // notify
    await notifyAllExceptAdmin(
      `A new enquiry (${enquiry.enquiryId}) has been created for lead "${lead.leadDetails?.clientName || lead.name}" by ${req.user?.name || 'a user'}.`,
      `/leadDetails?leadId=${lead._id}`
    );

    return res.status(200).json({
      message: 'Enquiry submitted successfully ✅',
      enquiryId: enquiry.enquiryId,
      leadId: lead._id,
    });
  } catch (err) {
    // return 400 for known Mongoose validation errors
    if (err?.name === 'ValidationError') {
      console.error('❌ Enquiry validation error:', err);
      return res.status(400).json({ error: 'Validation error', details: err.message });
    }
    console.error('❌ Backend error:', err);
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
};

exports.downloadEnquiryPdf = async (req, res) => {
  try {
    const enquiry = await Enquiry.findOne({ enquiryId: req.params.id });

    if (!enquiry || !enquiry.pdfData) {
      return res.status(404).json({ error: 'PDF not found' });
    }

    if (
      (!req.user || req.user.role !== 'admin') &&
      enquiry.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ error: 'Forbidden: You do not have access to this PDF' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${enquiry.enquiryId}.pdf`);
    return res.send(enquiry.pdfData);
  } catch (err) {
    console.error('❌ Download error:', err);
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
};

exports.getAllPdfsByLead = async (req, res) => {
  try {
    const leadIdParam = req.params.leadId;
    console.log('[getAllPdfsByLead] leadId param:', leadIdParam);

    if (!mongoose.Types.ObjectId.isValid(leadIdParam)) {
      return res.status(400).json({ error: 'Invalid leadId format' });
    }

    const leadObjectId = new mongoose.Types.ObjectId(leadIdParam);
    const query = {
      lead: leadObjectId,
      ...(req.user?.role !== 'admin' ? { createdBy: req.user._id } : {}),
    };

    const enquiries = await Enquiry.find(query).sort({ createdAt: -1 });
    if (!enquiries.length) {
      return res.status(404).json({ error: 'No enquiries found' });
    }

    return res.status(200).json(
      enquiries.map(e => ({
        enquiryId: e.enquiryId,
        createdAt: e.createdAt,
        pdfUrl: `/api/enquiry/pdf/${e.enquiryId}`,
      }))
    );
  } catch (err) {
    console.error('❌ getAllPdfsByLead error:', err);
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
};
