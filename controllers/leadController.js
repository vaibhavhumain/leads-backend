const Lead = require('../models/Lead');
const User = require('../models/User');

// Create a new led
exports.createLead = async (req, res) => {
  const { leadDetails } = req.body;

  try {
    if (!leadDetails) {
      return res.status(400).json({ message: 'Lead details are required' });
    }

    console.log('Received leadDetails:', leadDetails); 

    const newLead = new Lead({
      leadDetails,
      createdBy: req.user.id,
    });

    await newLead.save();

    const populatedLead = await Lead.findById(newLead._id)
      .populate('createdBy', 'name email')
      .populate('forwardedTo.user', 'name email');

    console.log('Saved lead:', populatedLead); 

    res.status(201).json({ message: 'Lead created successfully', lead: populatedLead });
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ message: 'Error creating lead', error: error.message });
  }
};
// Forward lead to another user
exports.forwardLead = async (req, res) => {
  const { leadId, userId } = req.body;
  const loggedInUser = req.user;

  console.log("➡️ Forwarding leadId:", leadId, "to userId:", userId);
  console.log("➡️ Logged in user:", loggedInUser?.email);

  if (!loggedInUser || !loggedInUser.email) {
    return res.status(401).json({ message: 'User not logged in or email not found' });
  }

  try {
    const lead = await Lead.findById(leadId);
    console.log("✅ Fetched lead:", lead?._id);

    if (!lead) {
      console.log("❌ Lead not found");
      return res.status(404).json({ message: 'Lead not found' });
    }

    const receiver = await User.findById(userId);
    console.log("✅ Fetched receiver:", receiver?.email);

    if (!receiver || !receiver.email) {
      console.log("❌ Receiver user not found or no email");
      return res.status(404).json({ message: 'Receiver user not found or email not available' });
    }

    // Update lead
    lead.forwardedTo = {
      user: userId,
      forwardedAt: new Date(),
    };
    lead.status = 'In Progress';
    lead.previousDetails = null; 
    lead.isFrozen = true; 
    await lead.save();
    console.log("✅ Lead updated and saved");

    res.status(200).json({ message: 'Lead forwarded successfully', lead });

  } catch (error) {
    console.error('🔥 Error forwarding lead:', {
      message: error.message,
      stack: error.stack,
    });

    res.status(500).json({ message: 'Error forwarding lead', error: error.message });
  }
};


// Add a follow-up call
exports.addFollowUp = async (req, res) => {
  const { leadId, followUp } = req.body;

  try {
    const lead = await Lead.findById(leadId);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    if (!followUp || !followUp.date || !followUp.notes) {
      return res.status(400).json({ message: 'Follow-up details (date & notes) are required' });
    }

    const followUpDate = new Date(followUp.date);
    if (isNaN(followUpDate)) {
      return res.status(400).json({ message: 'Invalid date format' });
    }
    lead.followUps.push({
      date: followUpDate,
      notes: followUp.notes,
    });

    await lead.save();

    res.status(200).json({ message: 'Follow-up added successfully', lead });
  } catch (error) {
    console.error('Error adding follow-up:', error);
    res.status(500).json({ message: 'Error adding follow-up', error: error.message });
  }
};


// Get all leads (for Admin)

exports.getLeads = async (req, res) => {
  try {
    const userId = req.user._id;
    const role = req.user.role;

    let leads;

    if (role === 'admin') {
      leads = await Lead.find()
        .populate('createdBy', 'name email')
        .populate('forwardedTo.user', 'name email');
    } else if (role === 'bd') {
      leads = await Lead.find({ createdBy: userId })
        .populate('createdBy', 'name email')
        .populate('forwardedTo.user', 'name email');
    } else if (role === 'sales') {
      leads = await Lead.find({ 'forwardedTo.user': userId })
        .populate('createdBy', 'name email')
        .populate('forwardedTo.user', 'name email');
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json(leads);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching leads', error: error.message });
  }
};


// Get a single lead by ID
exports.getLeadById = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('forwardedTo.user', 'name email');

    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    res.status(200).json(lead);
  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({ message: 'Error fetching lead', error: error.message });
  }
};

// Update lead status
exports.updateLeadStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const validStatuses = ['New', 'In Progress', 'Followed Up', 'Converted', 'Closed', 'Not Interested'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status value' });
  }

  try {
    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    lead.status = status;

    // ✅ If the forwarded user is updating the status, unfreeze for the creator
    if (lead.forwardedTo?.user?.toString() === req.user._id.toString()) {
      lead.isFrozen = false;
    }

    await lead.save();

    res.status(200).json({ message: 'Lead status updated successfully', lead });
  } catch (error) {
    console.error('Error updating lead status:', error);
    res.status(500).json({ message: 'Error updating lead status', error: error.message });
  }
};

// Get leads forwarded TO the logged-in user
exports.getForwardedLeadsToMe = async (req, res) => {
  try {
    const userId = req.user.id;

    const leads = await Lead.find({ 'forwardedTo.user': userId })
      .populate('createdBy', 'name email')
      .populate('forwardedTo.user', 'name email');

    res.status(200).json(leads);
  } catch (error) {
    console.error('Error fetching forwarded leads:', error);
    res.status(500).json({ message: 'Error fetching forwarded leads', error: error.message });
  }
};


// Get leads related to logged-in user (created or forwarded)
exports.getMyLeads = async (req, res) => {
  try {
    const userId = req.user.id;

    const leads = await Lead.find({
      $or: [
        { createdBy: userId },
        { 'forwardedTo.user': userId }
      ]
    })
      .populate('createdBy', 'name email')
      .populate('forwardedTo.user', 'name email');

    res.status(200).json(leads);
  } catch (error) {
    console.error('Error fetching user-specific leads:', error);
    res.status(500).json({ message: 'Error fetching user leads', error: error.message });
  }
};
