const Lead = require('../models/Lead');
const Enquiry = require('../models/Enquiry');
const generateEnquiryExcel = require('../config/generateEnquiryExcel'); // ✅ use Excel
const notifyAllExceptAdmin = require('../config/createNotifications');
const mongoose = require("mongoose");
const { mapLuxuryToFitments } = require('../utils/mapLuxuryToFitments');

/* ------------------------
   Helpers
------------------------ */
function buildBaseEnquiryId(userName) {
  const initials = userName ? userName.substring(0, 3).toUpperCase() : "USR";
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `GC-${initials}-${yyyy}${mm}${dd}`;
}

async function nextSequencedIdGlobal(baseId) {
  const regex = new RegExp(`^${baseId}(-\\d{2})?$`);
  const existing = await Enquiry.find({ enquiryId: { $regex: regex } }, { enquiryId: 1 }).lean();

  let maxSuffix = 0;
  let hasExactBase = false;

  for (const { enquiryId } of existing) {
    if (enquiryId === baseId) { hasExactBase = true; continue; }
    const match = enquiryId.match(/-(\d{2})$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!Number.isNaN(num) && num > maxSuffix) maxSuffix = num;
    }
  }

  const next = maxSuffix > 0 ? maxSuffix + 1 : (hasExactBase ? 2 : 1);
  return `${baseId}-${String(next).padStart(2, '0')}`;
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
  delete out.enquiryId;

  Object.keys(out).forEach((k) => {
    const v = out[k];
    const isPlainObj = v && typeof v === 'object' && !Array.isArray(v);
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

  if (!out.customerType) out.customerType = null;
  return out;
}

/* ------------------------
   Create Enquiry
------------------------ */
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

    let enquiry;
    for (let attempt = 0; attempt < 3; attempt++) {
      const enquiryId = await nextSequencedIdGlobal(baseId);
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
          enquiryId,
        });
        break;
      } catch (e) {
        if (e?.code === 11000 && attempt < 2) continue;
        throw e;
      }
    }

    // ---- Generate & attach Excel ----
    const excelBuffer = await generateEnquiryExcel(enquiry.toObject());
    enquiry.excelData = excelBuffer;
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
    const status = err?.code === 11000 ? 409 : 500;
    console.error('❌ createEnquiry error:', err);
    return res.status(status).json({ error: 'Server error', details: err.message });
  }
};

/* ------------------------
   Download Excel
------------------------ */
exports.downloadEnquiryExcel = async (req, res) => {
  try {
    const enquiry = await Enquiry.findOne({ enquiryId: req.params.id });
    if (!enquiry) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }

    if (!enquiry.excelData) {
      const buffer = await generateEnquiryExcel(enquiry.toObject());
      enquiry.excelData = buffer;
      await enquiry.save();
    }

    if (
      (!req.user || req.user.role !== 'admin') &&
      enquiry.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ error: 'Forbidden: You do not have access to this Excel' });
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename=${enquiry.enquiryId}.xlsx`);
    return res.send(enquiry.excelData);
  } catch (err) {
    console.error('❌ downloadEnquiryExcel error:', err);
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
};

/* ------------------------
   Get all by lead
------------------------ */
exports.getAllExcelsByLead = async (req, res) => {
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
        excelUrl: `/api/enquiry/excel/${e.enquiryId}`,
      }))
    );
  } catch (err) {
    console.error('❌ getAllExcelsByLead error:', err);
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
};

/* ------------------------
   Update Luxury Enquiry
------------------------ */
exports.updateLuxuryEnquiry = async (req, res) => {
  try {
    const { enquiryId } = req.params;
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
      const mapped = mapLuxuryToFitments(luxuryData || {}, modelName || null);
      update.luxuryData = luxuryData || {};
      update.standardFitments = mapped.standardFitments;
      update.optionalFitmentsSelected = mapped.optionalFitmentsSelected;
      update.extraCostFitments = mapped.extraCostFitments;
      update.customExtras = mapped.customExtras;
    } else {
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
    if (!enquiry) return res.status(404).json({ error: 'Enquiry not found' });

    const excelBuffer = await generateEnquiryExcel(enquiry.toObject());
    enquiry.excelData = excelBuffer;
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

/* ------------------------
   Save Luxury Details
------------------------ */
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

    const excelBuffer = await generateEnquiryExcel(enquiry.toObject());
    enquiry.excelData = excelBuffer;
    await enquiry.save();

    return res.status(200).json({ message: "Luxury details saved ✅", enquiry });
  } catch (err) {
    console.error("❌ saveLuxuryDetails error:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
};
