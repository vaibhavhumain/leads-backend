const Lead = require('../models/Lead');
const Enquiry = require('../models/Enquiry');
const generateEnquiryPdf = require('../config/generateEnquiryPdf');
const notifyAllExceptAdmin = require('../config/createNotifications');
const mongoose = require("mongoose");
const { mapLuxuryToFitments } = require('../utils/mapLuxuryToFitments');

function buildBaseEnquiryId(userName) {
  const initials = userName ? userName.substring(0, 3).toUpperCase() : "USR";
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `GC-${initials}-${yyyy}${mm}${dd}`;
}

async function nextSequencedIdForLead(baseId, leadObjectId) {
  const regex = new RegExp(`^${baseId}(?:-(\\d{2}))?$`);
  const existing = await Enquiry
    .find({ lead: leadObjectId, enquiryId: { $regex: regex } }, { enquiryId: 1 })
    .lean();

  let maxSuffix = 0;
  let hasExactBase = false;

  for (const { enquiryId } of existing) {
    if (enquiryId === baseId) { hasExactBase = true; continue; }
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

function sanitizePayload(data) {
  const numberFields = [
    'businessNumberOfBuses',
    'businessBusesPerYear',
    'businessEmployees',
    'numberOfSeats',
    'totalSeats',
  ];

  const out = { ...data };
  delete out.enquiryId; // never trust client-id from client side

  Object.keys(out).forEach((k) => {
    const v = out[k];
    const isPlainObj = v && typeof v === 'object' && !Array.isArray(v);

    // Keep objects/arrays as they are. For scalars, replace empty with null
    if (!isPlainObj && (v === '' || v === undefined)) {
      out[k] = null;
    }
  });

  numberFields.forEach((k) => {
    if (out[k] !== undefined && out[k] !== null) {
      const n = Number(out[k]);
      if (Number.isNaN(n)) out[k] = null;
      else out[k] = n;
    }
  });

  // avoid enum error if customerType is empty string
  if (!out.customerType) out.customerType = null;

  return out;
}


exports.createEnquiry = async (req, res) => {
  try {
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

    const modelName = clean.modelName || clean.suggestedModel || null;
    const luxuryData = clean.luxuryData || {};
    const mapped = mapLuxuryToFitments(luxuryData, modelName);

    const baseId = buildBaseEnquiryId(req.user?.name);

    // ---- Create with sequence & tiny retry on collision ----
    let enquiry;
    for (let attempt = 0; attempt < 3; attempt++) {
      const enquiryId = await nextSequencedIdForLead(baseId, lead._id);
      try {
        enquiry = await Enquiry.create({
          ...clean,
          modelName,
          luxuryData,
          standardFitments: mapped.standardFitments,
          optionalFitmentsSelected: mapped.optionalFitmentsSelected,
          extraCostFitments: mapped.extraCostFitments,
          customExtras: mapped.customExtras,

          lead: lead._id,
          createdBy: req.user._id,
          enquiryId, // server-owned
        });
        break; // success
      } catch (e) {
        if (e?.code === 11000 && attempt < 2) continue; // race, try next suffix
        throw e;
      }
    }

    // ---- Generate & attach PDF (server-side) ----
    const pdfBuffer = await generateEnquiryPdf(enquiry.toObject());
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

/* ===========================
 * DOWNLOAD PDF
 * =========================== */
exports.downloadEnquiryPdf = async (req, res) => {
  try {
    const enquiry = await Enquiry.findOne({ enquiryId: req.params.id });

    if (!enquiry) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }

    if (!enquiry.pdfData) {
      const pdfBuffer = await generateEnquiryPdf(enquiry.toObject());
      enquiry.pdfData = pdfBuffer;
      await enquiry.save();
    }

    if (
      (!req.user || req.user.role !== 'admin') &&
      enquiry.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ error: 'Forbidden: You do not have access to this PDF' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=${enquiry.enquiryId}.pdf`);
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

/* ===========================
 * UPDATE luxury/model (flexible)
 * - Accepts raw luxuryData (+ modelName) OR fully-formed arrays
 * - Always regenerates arrays if luxuryData provided
 * =========================== */
exports.updateLuxuryEnquiry = async (req, res) => {
  try {
    const { enquiryId } = req.params;

    // Accept both shapes:
    // A) raw: { modelName, luxuryData: {...} }
    // B) arrays: { standardFitments, optionalFitmentsSelected, extraCostFitments, customExtras }
    const {
      modelName,
      luxuryData,
      standardFitments,
      optionalFitmentsSelected,
      extraCostFitments,
      customExtras,
    } = req.body || {};

    const update = {};

    if (modelName !== undefined) update.modelName = modelName;

    if (luxuryData !== undefined) {
      // Raw → map to arrays
      const mapped = mapLuxuryToFitments(luxuryData || {}, modelName || null);
      update.luxuryData = luxuryData || {};
      update.standardFitments = mapped.standardFitments;
      update.optionalFitmentsSelected = mapped.optionalFitmentsSelected;
      update.extraCostFitments = mapped.extraCostFitments;
      update.customExtras = mapped.customExtras;
    } else {
      // If arrays are directly provided, accept them
      if (standardFitments !== undefined) update.standardFitments = standardFitments;
      if (optionalFitmentsSelected !== undefined) update.optionalFitmentsSelected = optionalFitmentsSelected;
      if (extraCostFitments !== undefined) update.extraCostFitments = extraCostFitments;
      if (customExtras !== undefined) update.customExtras = customExtras;
    }

    const enquiry = await Enquiry.findOneAndUpdate(
      { enquiryId },
      { $set: update },
      { new: true }
    );

    if (!enquiry) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }

    // Re-generate attached PDF
    const pdfBuffer = await generateEnquiryPdf(enquiry.toObject()); 
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
    const { leadId } = req.params;
    const enquiry = await Enquiry.findOne({ lead: leadId }).sort({ createdAt: -1 });

    if (!enquiry) {
      return res.status(404).json({ error: "Enquiry not found for this lead" });
    }

    const {
      modelName,
      luxuryData,
      standardFitments,
      optionalFitmentsSelected,
      extraCostFitments,
      customExtras,
    } = req.body || {};

    const updateModelName = modelName || enquiry.modelName || null;

    if (luxuryData) {
      const mapped = mapLuxuryToFitments(luxuryData, updateModelName);
      enquiry.luxuryData = luxuryData;
      enquiry.standardFitments = mapped.standardFitments;
      enquiry.optionalFitmentsSelected = mapped.optionalFitmentsSelected;
      enquiry.extraCostFitments = mapped.extraCostFitments;
      enquiry.customExtras = mapped.customExtras;
    } else {
      if (standardFitments) enquiry.standardFitments = standardFitments;
      if (optionalFitmentsSelected) enquiry.optionalFitmentsSelected = optionalFitmentsSelected;
      if (extraCostFitments) enquiry.extraCostFitments = extraCostFitments;
      if (customExtras) enquiry.customExtras = customExtras;
    }

    enquiry.modelName = updateModelName;

    const pdfBuffer = await generateEnquiryPdf(enquiry.toObject());
    enquiry.pdfData = pdfBuffer;

    await enquiry.save();

    return res.status(200).json({ message: "Luxury details saved ✅", enquiry });
  } catch (err) {
    console.error("❌ saveLuxuryDetails error:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
};
