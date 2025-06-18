const generateProposalPdf = require('../config/generateProposalPdf');
const Lead = require('../models/Lead');
const Enquiry = require('../models/Enquiry');
exports.generateProposalForLead = async (req, res) => {
  try {
    const { leadId } = req.params;
    const lead = await Lead.findById(leadId).populate('createdBy');
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const latestEnquiry = await Enquiry.findOne({ lead: leadId }).sort({ createdAt: -1 });
    if (!latestEnquiry) return res.status(404).json({ error: 'No enquiry found for this lead' });

    const proposalPdf = await generateProposalPdf(latestEnquiry);

    latestEnquiry.proposalPdf = proposalPdf;
    await latestEnquiry.save();

    res.status(200).json({
      message: 'Proposal PDF generated and saved in DB ✅',
      enquiryId: latestEnquiry.enquiryId,
    });
  } catch (err) {
    console.error('❌ Proposal PDF Error:', err);
    res.status(500).json({ error: 'Failed to generate proposal', details: err.message });
  }
};

exports.downloadProposalPdf = async (req, res) => {
  try {
    const enquiry = await Enquiry.findOne({ enquiryId: req.params.id });

    if (!enquiry || !enquiry.proposalPdf) {
      return res.status(404).json({ error: 'Proposal PDF not found' });
    }

    // Permission check
    if (
      (!req.user || req.user.role !== 'admin') &&
      enquiry.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ error: 'Unauthorized access to proposal PDF' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Proposal-${enquiry.enquiryId}.pdf`);
    res.send(enquiry.proposalPdf);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'Failed to download proposal PDF' });
  }
};
