const Lead = require('../models/Lead');
const User = require('../models/User');

// Create a new led
exports.createLead = async (req, res) => {
  const { leadDetails } = req.body;

  if (!leadDetails?.contacts || !Array.isArray(leadDetails.contacts) || leadDetails.contacts.length === 0) {
    return res.status(400).json({ message: 'At least one contact number is required' });
  }

  try {
    const newLead = new Lead({
      leadDetails: {
        source: leadDetails.source || '',
        clientName: leadDetails.clientName || 'N/A',
        contacts: leadDetails.contacts,
        companyName: leadDetails.companyName || '',
        location: leadDetails.location || '',
        email: leadDetails.email || '',
      },
      createdBy: req.user.id,
    });

    await newLead.save();
    const populatedLead = await Lead.findById(newLead._id)
      .populate('createdBy', 'name email')
      .populate('forwardedTo.user', 'name email');

    res.status(201).json({ message: 'Lead created successfully', lead: populatedLead });
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ message: 'Error creating lead', error: error.message });
  }
};


// update Lead details
exports.updateClientName = async (req, res) => {
  const { id } = req.params;
  const { clientName } = req.body;

  if (!clientName || !clientName.trim()) {
    return res.status(400).json({ message: 'Client name is required' });
  }

  try {
    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    lead.leadDetails.clientName = clientName.trim();
    await lead.save();

    res.status(200).json({ message: 'Client name updated', lead });
  } catch (err) {
    console.error('Error updating client name:', err);
    res.status(500).json({ message: 'Failed to update client name' });
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
      return res.status(404).json({ message: 'Lead not found' });
    }

    const receiver = await User.findById(userId);
    if (!receiver || !receiver.email) {
      return res.status(404).json({ message: 'Receiver user not found or email not available' });
    }

    // ✅ Only assign forwardedTo and freeze access
    lead.forwardedTo = {
      user: userId,
      forwardedAt: new Date(),
    };
    lead.isFrozen = true;
    await lead.save();

    const updatedLead = await Lead.findById(leadId)
      .populate('createdBy', 'name email')
      .populate('forwardedTo.user', 'name email');

    res.status(200).json({ message: 'Lead forwarded successfully', lead: updatedLead });

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
  by: req.user._id  // ✅ Add this line
});

    await lead.save();

    res.status(200).json({ message: 'Follow-up added successfully', lead });
  } catch (error) {
    console.error('Error adding follow-up:', error);
    res.status(500).json({ message: 'Error adding follow-up', error: error.message });
  }
};

// Save Action Plan / Remarks
exports.saveActionPlan = async (req, res) => {
  const { leadId, actionPlan } = req.body;

  if (!actionPlan || !actionPlan.trim()) {
    return res.status(400).json({ message: 'Action Plan is required' });
  }

  try {
    const lead = await Lead.findById(leadId);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    lead.actionPlans.unshift({
      text: actionPlan.trim(),
      addedBy: req.user._id,
    });

    await lead.save();

    const updatedLead = await Lead.findById(leadId).populate('actionPlans.addedBy', 'name');

    res.status(200).json({ message: 'Action Plan saved', actionPlans: updatedLead.actionPlans });
  } catch (error) {
    console.error('Error saving action plan:', error);
    res.status(500).json({ message: 'Failed to save action plan', error: error.message });
  }
};


// Get Action Plans for a lead
exports.getActionPlans = async (req, res) => {
  const { leadId } = req.params;

  try {
    const lead = await Lead.findById(leadId).populate('actionPlans.addedBy', 'name');
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    res.status(200).json({ actionPlans: lead.actionPlans || [] });
  } catch (error) {
    console.error('Error fetching action plans:', error);
    res.status(500).json({ message: 'Failed to fetch action plans', error: error.message });
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
        .populate('forwardedTo.user', 'name email')
        .populate('remarksHistory.updatedBy', 'name');
    } else if (role === 'bd') {
      leads = await Lead.find({ createdBy: { $ne: userId } }) // ❌ Exclude own leads
        .populate('createdBy', 'name email')
        .populate('forwardedTo.user', 'name email')
        .populate('remarksHistory.updatedBy', 'name');
    } else if (role === 'sales') {
      leads = await Lead.find({ 'forwardedTo.user': userId }) // forwarded leads only
        .populate('createdBy', 'name email')
        .populate('forwardedTo.user', 'name email')
        .populate('remarksHistory.updatedBy', 'name');
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json(leads);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching leads', error: error.message });
  }
};


// Get all leads (for search purpose)
exports.getAllLeads = async (req, res) => {
  try {
    const leads = await Lead.find()
      .populate('createdBy', 'name email')
      .populate('forwardedTo.user', 'name email')
      .populate('remarksHistory.updatedBy', 'name');

    res.status(200).json(leads);
  } catch (error) {
    console.error('Error fetching all leads:', error);
    res.status(500).json({ message: 'Error fetching all leads', error: error.message });
  }
};
// Bulk create leads
exports.bulkCreateLeads = async (req, res) => {
  const { leads } = req.body;

  if (!Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({ message: 'Leads array is required' });
  }

  try {
    const leadsWithCreator = leads.map((lead) => ({
      leadDetails: {
        companyName: lead.leadDetails?.companyName || '',
        contacts: lead.leadDetails?.contacts && Array.isArray(lead.leadDetails.contacts)
          ? lead.leadDetails.contacts
          : (lead.leadDetails?.contact
            ? [{ number: lead.leadDetails.contact, label: 'Primary' }]
            : []),
        location: lead.leadDetails?.location || '',
        source: 'Excel Upload',
        clientName: lead.leadDetails?.clientName || 'N/A',
        email: lead.leadDetails?.email || '',
      },
      status: lead.status || 'Cold',
      connectionStatus: lead.connectionStatus || 'Not Connected',
      createdBy: req.user.id,
      followUps: [],
      forwardedTo: {},
      isFrozen: false,
      remarksHistory: [],
    }));

    const createdLeads = await Lead.insertMany(leadsWithCreator);

    res.status(201).json({ message: 'Leads created successfully', leads: createdLeads });
  } catch (error) {
    console.error('Error bulk-creating leads:', error);
    res.status(500).json({ message: 'Error creating leads', error: error.message });
  }
};


// Update lead email
exports.updateEmail = async (req, res) => {
  const { id } = req.params;
  const { email } = req.body;

  if (!email || !email.trim()) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    lead.leadDetails.email = email.trim();
    await lead.save();

    res.status(200).json({ message: 'Email updated', lead });
  } catch (err) {
    console.error('Error updating email:', err);
    res.status(500).json({ message: 'Failed to update email' });
  }
};


// Search leads globally by phone number
exports.searchLeadsByPhone = async (req, res) => {
  const { phone } = req.query;

  if (!phone) {
    return res.status(400).json({ message: 'Phone number is required' });
  }

  try {
    const query = {
      'leadDetails.contacts.number': { $regex: phone, $options: 'i' }
    };

    const leads = await Lead.find(query)
      .populate('createdBy', 'name email')
      .populate('forwardedTo.user', 'name email')
      .populate('remarksHistory.updatedBy', 'name');

    res.status(200).json(leads);
  } catch (error) {
    console.error('🔥 Error in searchLeadsByPhone:', error);
    res.status(500).json({ message: 'Error searching leads', error: error.message });
  }
};



// Get a single lead by ID
exports.getLeadById = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('forwardedTo.user', 'name email')
      .populate('followUps.by', 'name email')
      .populate('remarksHistory.updatedBy', 'name email'); // ✅ Add this line

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
  const { status, remarks, date } = req.body;
  const validStatuses = ['Hot', 'Warm', 'Cold',];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status value' });
  }

  try {
    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    lead.status = status;
     if (remarks) {
      lead.remarks = remarks;
      lead.date = date || new Date();

      lead.remarksHistory.push({
        remarks,
        date: new Date(),
        updatedBy: req.user._id,
      });
    }
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

// delete a lead
exports.deleteLead = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Lead.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    res.status(200).json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ message: 'Error deleting lead', error: error.message });
  }
};

// delete all Leads (for admin)
exports.deleteAllLeads = async (req, res) => {
  try {
    const result = await Lead.deleteMany({});
    res.status(200).json({ message: `Deleted ${result.deletedCount} leads` });
  } catch (error) {
    console.error('Error deleting all leads:', error);
    res.status(500).json({ message: 'Failed to delete all leads', error: error.message });
  }
};

// updating connection status
exports.updateConnectionStatus = async (req, res) => {
  const { id } = req.params;
  const { connectionStatus } = req.body;
  console.log('🟡 Received:', { id, connectionStatus });
  if (!['Connected', 'Not Connected'].includes(connectionStatus)) {
    return res.status(400).json({ message: 'Invalid connection status' });
  }

  try {
    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    lead.connectionStatus = connectionStatus;
    await lead.save();

    res.status(200).json({ message: 'Connection status updated', lead });
  } catch (error) {
    console.error('Error updating connection status:', error);
    res.status(500).json({ message: 'Error updating connection status', error: error.message });
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
      .populate('forwardedTo.user', 'name email')
      .populate('remarksHistory.updatedBy', 'name');

    res.status(200).json(leads);
  } catch (error) {
    console.error('Error fetching user-specific leads:', error);
    res.status(500).json({ message: 'Error fetching user leads', error: error.message });
  }
};

// Add a new contact number to the lead
exports.addContact = async (req, res) => {
  const { id } = req.params; // leadId
  const { number, label } = req.body;

  if (!number || !number.trim()) {
    return res.status(400).json({ message: 'Contact number is required' });
  }

  try {
    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    // Check for duplicates (optional)
    const exists = lead.leadDetails.contacts.find(c => c.number === number.trim());
    if (exists) {
      return res.status(409).json({ message: 'Contact number already exists for this lead' });
    }

    lead.leadDetails.contacts.push({
      number: number.trim(),
      label: label || 'Alternate',
    });
    await lead.save();

    res.status(200).json({ message: 'Contact added', lead });
  } catch (err) {
    console.error('Error adding contact', err);
    res.status(500).json({ message: 'Failed to add contact' });
  }
};

// Add an activity (factory visit or in-person meeting)
exports.addActivity = async (req, res) => {
  const { leadId } = req.params;
  const { type, date, location, remarks, outcome } = req.body;

  if (!['factory_visit', 'in_person_meeting'].includes(type)) {
    return res.status(400).json({ message: 'Invalid activity type' });
  }
  if (!date) {
    return res.status(400).json({ message: 'Activity date is required' });
  }
  try {
    const lead = await Lead.findById(leadId);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    lead.activities.push({
      type,
      date,
      conductedBy: req.user._id, // Automatically log in the logged-in user
      location,
      remarks,
      outcome,
    });
    await lead.save();

    // Optionally populate for response
    await lead.populate('activities.conductedBy', 'name email');
    res.status(200).json({ message: 'Activity added', activities: lead.activities });
  } catch (err) {
    console.error('Error adding activity:', err);
    res.status(500).json({ message: 'Error adding activity', error: err.message });
  }
};

// Get all activities for a lead
exports.getActivities = async (req, res) => {
  const { leadId } = req.params;
  try {
    const lead = await Lead.findById(leadId).populate('activities.conductedBy', 'name email');
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    res.status(200).json({ activities: lead.activities });
  } catch (err) {
    console.error('Error fetching activities:', err);
    res.status(500).json({ message: 'Error fetching activities', error: err.message });
  }
};
