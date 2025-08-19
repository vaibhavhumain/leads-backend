const Lead = require('../models/Lead');
const Enquiry = require('../models/Enquiry');
const generateEnquiryPdf = require('../config/generateEnquiryPdf');
const notifyAllExceptAdmin = require('../config/createNotifications');
const mongoose = require("mongoose");

// ---- Build BASE (no sequence here) ----
function buildBaseEnquiryId(userName) {
  const initials = userName ? userName.substring(0, 3).toUpperCase() : "USR";
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `GC-${initials}-${yyyy}${mm}${dd}`;
}

// ---- Given a lead + base, compute the next XX suffix safely ----
async function nextSequencedIdForLead(baseId, leadObjectId) {
  // Match either exact base ("GC-...-YYYYMMDD") OR suffixed ("GC-...-YYYYMMDD-XX")
  const regex = new RegExp(`^${baseId}(?:-(\\d{2}))?$`);

  // Pull only enquiryId to keep it light
  const existing = await Enquiry
    .find({ lead: leadObjectId, enquiryId: { $regex: regex } }, { enquiryId: 1 })
    .lean();

  let maxSuffix = 0;
  let hasExactBase = false;

  for (const { enquiryId } of existing) {
    if (enquiryId === baseId) {
      hasExactBase = true;          // old unsuffixed record -> treat as 01
      continue;
    }
    const m = enquiryId.match(/-(\d{2})$/);
    if (m) {
      const num = parseInt(m[1], 10);
      if (!Number.isNaN(num) && num > maxSuffix) maxSuffix = num;
    }
  }

  const next = maxSuffix > 0 ? maxSuffix + 1 : (hasExactBase ? 2 : 1);
  const pad2 = String(next).padStart(2, '0');

  return `${baseId}-${pad2}`;
}

// ---- Sanitize incoming payload ----
function sanitizePayload(data) {
  const numberFields = [
    'businessNumberOfBuses',
    'businessBusesPerYear',
    'businessEmployees',
    'numberOfSeats',
    'totalSeats',
  ];
  const out = { ...data };
  delete out.enquiryId; // never trust client

  Object.keys(out).forEach((k) => {
    if (out[k] === '' || out[k] === null || out[k] === undefined) delete out[k];
  });

  numberFields.forEach((k) => {
    if (out[k] !== undefined) {
      const n = Number(out[k]);
      if (Number.isNaN(n)) delete out[k];
      else out[k] = n;
    }
  });

  if (!out.customerType) delete out.customerType; // avoid enum error
  return out;
}

exports.createEnquiry = async (req, res) => {
  try {
    // ---- Auth & lead checks ----
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

    const clean = sanitizePayload(req.body);
    const baseId = buildBaseEnquiryId(req.user?.name);

    // ---- Create with sequence & tiny retry on collision ----
    let enquiry;
    for (let attempt = 0; attempt < 3; attempt++) {
      const enquiryId = await nextSequencedIdForLead(baseId, lead._id);
      try {
        enquiry = await Enquiry.create({
          ...clean,
          lead: lead._id,
          createdBy: req.user._id,
          enquiryId, // server-owned
        });
        break; // success
      } catch (e) {
        if (e?.code === 11000 && attempt < 2) {
          // race: someone inserted same suffix just now -> re-loop to pick next suffix
          continue;
        }
        throw e;
      }
    }

    // ---- Generate & attach PDF ----
    const pdfBuffer = await generateEnquiryPdf(enquiry);
    enquiry.pdfData = pdfBuffer;
    await enquiry.save();

    // ---- Notify ----
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
    if (err?.name === 'ValidationError') {
      console.error('❌ Enquiry validation error:', err);
      return res.status(400).json({ error: 'Validation error', details: err.message });
    }
    const status = err?.code === 11000 ? 409 : 500;
    console.error('❌ Backend error:', err);
    return res.status(status).json({ error: 'Server error', details: err.message });
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

exports.updateLuxuryEnquiry = async (req, res) => {
  try {
    const { enquiryId } = req.params;
    const {
      modelName,
      standardFitments,
      optionalFitmentsSelected,
      extraCostFitments,
      customExtras,
      luxuryData,
    } = req.body;

    const enquiry = await Enquiry.findOneAndUpdate(
      { enquiryId },
      {
        $set: {
          modelName,
          standardFitments,
          optionalFitmentsSelected,
          extraCostFitments,
          customExtras,
          luxuryData,
        },
      },
      { new: true }
    );

    if (!enquiry) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }

    const pdfBuffer = await generateEnquiryPdf(enquiry);
    enquiry.pdfData = pdfBuffer;
    await enquiry.save();

    return res.status(200).json({
      message: 'Luxury enquiry updated successfully ✅',
      enquiry,
    });
  } catch (err) {
    console.error('❌ updateLuxuryEnquiry error:', err);
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
};

exports.saveLuxuryDetails = async (req, res) => {
  try {
    const { enquiryId } = req.params;
    const enquiry = await Enquiry.findOne({ enquiryId });

    if (!enquiry) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }

    // attach/update luxury details
    enquiry.luxuryDetails = req.body;
    await enquiry.save();

    return res.status(200).json({ message: 'Luxury details saved ✅' });
  } catch (err) {
    console.error('❌ saveLuxuryDetails error:', err);
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
};
