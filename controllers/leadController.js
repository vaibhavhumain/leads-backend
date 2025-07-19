const Lead = require('../models/Lead');
const User = require('../models/User');
const notifyAllExceptAdmin = require('../config/createNotifications');
const sendLeadNotificationEmail = require('../utils/sendLeadNotificationEmail');
// Create a new lead
exports.createLead = async (req, res) => {
  const { leadDetails } = req.body;

  if (leadDetails.contacts && leadDetails.contacts.length > 0) {
  const hasValidNumber = leadDetails.contacts.some(c => c.number && c.number.trim() !== '');
  if (!hasValidNumber) {
    return res.status(400).json({ message: "Invalid contact number" });
  }
}
  try {
    const newLead = new Lead({
  leadDetails: {
    source: leadDetails.source || '',
    clientName: leadDetails.clientName || 'N/A',
    contacts: leadDetails.contacts && leadDetails.contacts.length > 0
      ? leadDetails.contacts
      : [], 
    companyName: leadDetails.companyName || '',
    location: leadDetails.location || '',
    email: leadDetails.email || '',
  },
  createdBy: req.user.id,
  lifecycleStatus: 'active', 
});

    await newLead.save();
    const populatedLead = await Lead.findById(newLead._id)
      .populate('createdBy', 'name email')
      .populate('forwardedTo.user', 'name email');

    await notifyAllExceptAdmin(
      `New lead "${newLead.leadDetails.clientName}" created by ${req.user.name}.`,
      `/leadDetails?leadId=${newLead._id}`
    );

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

    // 🚩 Notify about name change
    await notifyAllExceptAdmin(
      `Client name updated for lead "${lead.leadDetails.clientName}".`,
      `/leadDetails?leadId=${lead._id}`
    );

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

  if (!loggedInUser || !loggedInUser.email) {
    return res.status(401).json({ message: 'User not logged in or email not found' });
  }

  try {
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    const receiver = await User.findById(userId);
    if (!receiver || !receiver.email) {
      return res.status(404).json({ message: 'Receiver user not found or email not available' });
    }

    // Assign forwardedTo and freeze access
    lead.forwardedTo = {
      user: userId,
      forwardedAt: new Date(),
    };
    lead.isFrozen = true;
    await lead.save();

    const updatedLead = await Lead.findById(leadId)
      .populate('createdBy', 'name email')
      .populate('forwardedTo.user', 'name email');

    // 🚩 Notify about forwarding
    await notifyAllExceptAdmin(
      `Lead "${lead.leadDetails.clientName}" forwarded to ${receiver.name} by ${loggedInUser.name}.`,
      `/leadDetails?leadId=${lead._id}`
    );
try {
  await sendLeadNotificationEmail({
    to: receiver.email,
    leadId: lead._id,
    leadDetails: lead.leadDetails,
    forwardedBy: loggedInUser.name
  });
} catch (emailErr) {
  console.error("📧 Failed to send email:", emailErr.message);
}


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
      by: req.user._id
    });

    await lead.save();

    // 🚩 Notify about follow-up
    await notifyAllExceptAdmin(
      `Follow-up added for lead "${lead.leadDetails.clientName}" by ${req.user.name}.`,
      `/leadDetails?leadId=${lead._id}`
    );

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

    // 🚩 Notify about new action plan
    await notifyAllExceptAdmin(
      `Action Plan/Remarks added for lead "${lead.leadDetails.clientName}" by ${req.user.name}.`,
      `/leadDetails?leadId=${lead._id}`
    );

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
    await notifyAllExceptAdmin(
      `${createdLeads.length} leads uploaded in bulk by ${req.user.name}.`,
      `/dashboard`
    );
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
      .populate('assignedTo', 'name') 
      .populate('forwardedTo.user', 'name email')
      .populate('followUps.by', 'name email')
      .populate('remarksHistory.updatedBy', 'name email')
      .populate('notes.addedBy', 'name email');


    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    res.status(200).json({lead});
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

    // 🚩 Notify about status change
    await notifyAllExceptAdmin(
      `Status of lead "${lead.leadDetails.clientName}" changed to "${status}" by ${req.user.name}.`,
      `/leadDetails?leadId=${lead._id}`
    );

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
  if (!['Connected', 'Not Connected'].includes(connectionStatus)) {
    return res.status(400).json({ message: 'Invalid connection status' });
  }

  try {
    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    lead.connectionStatus = connectionStatus;
    await lead.save();

    // 🚩 Notify about connection status
    await notifyAllExceptAdmin(
      `Connection status of lead "${lead.leadDetails.clientName}" updated to "${connectionStatus}" by ${req.user.name}.`,
      `/leadDetails?leadId=${lead._id}`
    );

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
  const { id } = req.params; 
  const { number, label } = req.body;

  if (!number || !number.trim()) {
    return res.status(400).json({ message: 'Contact number is required' });
  }

  try {
    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    // ✅ Ensure contacts array exists
    if (!Array.isArray(lead.leadDetails.contacts)) {
      lead.leadDetails.contacts = [];
    }

    // Check for duplicates
    const exists = lead.leadDetails.contacts.find(c => c.number === number.trim());
    if (exists) {
      return res.status(409).json({ message: 'Contact number already exists for this lead' });
    }

    // ✅ Add new contact
    lead.leadDetails.contacts.push({
      number: number.trim(),
      label: label || 'Alternate',
    });

    await lead.save();

    // ✅ Notify
    await notifyAllExceptAdmin(
      `Contact "${number.trim()}" added to lead "${lead.leadDetails.clientName}" by ${req.user.name}.`,
      `/leadDetails?leadId=${lead._id}`
    );

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
      conductedBy: req.user._id,
      location,
      remarks,
      outcome,
    });
    await lead.save();

    await lead.populate('activities.conductedBy', 'name email');

    // 🚩 Notify about activity
    await notifyAllExceptAdmin(
      `Activity "${type.replace('_', ' ')}" added for lead "${lead.leadDetails.clientName}" by ${req.user.name}.`,
      `/leadDetails?leadId=${lead._id}`
    );

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

exports.getAllActivities = async (req, res) => {
  try {
    // Fetch all leads and populate activities with user info
    const leads = await Lead.find().populate('activities.conductedBy', 'name email');
    // Flatten the activities from all leads into one array
    const activities = leads.flatMap(lead =>
      (lead.activities || []).map(activity => ({
        ...activity.toObject(),
        conductedBy: activity.conductedBy,
        leadName: lead.leadDetails.clientName,
        leadId: lead._id,
      }))
    );
    res.status(200).json(activities);
  } catch (err) {
    console.error('Error fetching all activities:', err);
    res.status(500).json({ message: 'Failed to fetch activities', error: err.message });
  }
};

// endpoint for admin
exports.getAllActivities = async (req, res) => {
  try {
    const leads = await Lead.find().populate('activities.conductedBy', 'name email');
    const activities = leads.flatMap(lead =>
      (lead.activities || []).map(activity => ({
        ...activity.toObject(),
        conductedBy: activity.conductedBy,
        leadName: lead.leadDetails.clientName,
        leadId: lead._id,
      }))
    );
    res.status(200).json(activities);
  } catch (err) {
    console.error('Error fetching all activities:', err);
    res.status(500).json({ message: 'Failed to fetch activities', error: err.message });
  }
};
// Delete lead by user (only if they created it)
// Delete lead - allowed for admin, bd, and sales roles
exports.deleteLeadByUser = async (req, res) => {
  const { id } = req.params;
  const userRole = req.user.role;

  // Allow deletion only for allowed roles
  if (!['admin', 'bd', 'sales'].includes(userRole)) {
    return res.status(403).json({ message: 'You are not allowed to delete leads' });
  }

  try {
    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    await lead.deleteOne();

    // 🚩 Notify all users except admin
    await notifyAllExceptAdmin(
      `Lead "${lead.leadDetails.clientName}" was deleted by ${req.user.name}.`,
      `/dashboard`
    );

    res.status(200).json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Error deleting lead by user:', error);
    res.status(500).json({ message: 'Error deleting lead', error: error.message });
  }
};

// Update lead company name
exports.updateCompanyName = async (req, res) => {
  const { id } = req.params;
  const { companyName } = req.body;

  if (!companyName || !companyName.trim()) {
    return res.status(400).json({ message: 'Company name is required' });
  }

  try {
    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    lead.leadDetails.companyName = companyName.trim();
    await lead.save();

    res.status(200).json({ message: 'Company name updated', lead });
  } catch (err) {
    console.error('Error updating company name:', err);
    res.status(500).json({ message: 'Failed to update company name' });
  }
};

// Update lead location
exports.updateLocation = async (req, res) => {
  const { id } = req.params;
  const { location } = req.body;

  if (!location || !location.trim()) {
    return res.status(400).json({ message: 'Location is required' });
  }

  try {
    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    lead.leadDetails.location = location.trim();
    await lead.save();

    // 🚩 Optional notification
    await notifyAllExceptAdmin(
      `Location updated for lead "${lead.leadDetails.clientName}" by ${req.user.name}.`,
      `/leadDetails?leadId=${lead._id}`
    );

    res.status(200).json({ message: 'Location updated', lead });
  } catch (err) {
    console.error('Error updating location:', err);
    res.status(500).json({ message: 'Failed to update location' });
  }
};

exports.updatePrimaryContact = async (req, res) => {
  const { contacts } = req.body; // Expecting an array of strings

  // Validate input
  if (!Array.isArray(contacts) || contacts.length === 0) {
    return res.status(400).json({ message: 'Contacts must be a non-empty array' });
  }

  const isValid = contacts.every((c) => /^\d{10}$/.test(c));
  if (!isValid) {
    return res.status(400).json({ message: 'Each contact must be a valid 10-digit number' });
  }

  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    // Save as array of objects: [{ number: "1234567890" }]
    lead.leadDetails.contacts = contacts.map((number) => ({ number }));

    await lead.save();

    res.json({ message: 'Contacts updated successfully', contacts: lead.leadDetails.contacts });
  } catch (err) {
    console.error('Update contact error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.filterLeads = async (req, res) => {
  const { date, connectionStatus, status, hasFollowUps, followUpDate } = req.query;

  try {
    const filter = {};

    if (date) {
      const start = new Date(date);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      filter.createdAt = { $gte: start, $lt: end };
    }

    if (connectionStatus === 'Connected' || connectionStatus === 'Not Connected') {
      filter.connectionStatus = connectionStatus;
    }

    if (status === 'Hot' || status === 'Warm' || status === 'Cold') {
      filter.status = status;
    }

    let leads = await Lead.find(filter)
      .populate('createdBy', 'name email')
      .populate('forwardedTo.user', 'name email')
      .populate('remarksHistory.updatedBy', 'name email');

    // Filter leads by follow-up presence
    if (hasFollowUps === 'true') {
      leads = leads.filter((lead) => Array.isArray(lead.followUps) && lead.followUps.length > 0);
    } else if (hasFollowUps === 'false') {
      leads = leads.filter((lead) => !Array.isArray(lead.followUps) || lead.followUps.length === 0);
    }

    // 💡 NEW: Filter by follow-up date
    if (followUpDate) {
      const selected = new Date(followUpDate);
      const nextDay = new Date(selected);
      nextDay.setDate(selected.getDate() + 1);

      leads = leads.filter(lead =>
        Array.isArray(lead.followUps) &&
        lead.followUps.some(fup => {
          const fupDate = new Date(fup.date);
          return fupDate >= selected && fupDate < nextDay;
        })
      );
    }

    res.status(200).json(leads);
  } catch (error) {
    console.error('Error filtering leads:', error);
    res.status(500).json({ message: 'Error filtering leads', error: error.message });
  }
};

exports.getFollowUpDates = async (req, res) => {
  try {
    const dates = await Lead.aggregate([
      { $unwind: '$followUps' },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$followUps.date' }
          }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    res.status(200).json(dates.map(d => d._id)); // returns ['2025-07-18', '2025-07-17', ...]
  } catch (err) {
    console.error('Error fetching follow-up dates:', err);
    res.status(500).json({ message: 'Failed to fetch dates', error: err.message });
  }
};


exports.addNote = async (req, res) => {
  const { leadId, text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ message: 'Note text is required' });
  }

  try {
    const lead = await Lead.findById(leadId);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    lead.notes.unshift({
      text: text.trim(),
      addedBy: req.user._id,
    });

    await lead.save();

    const updatedLead = await Lead.findById(leadId).populate('notes.addedBy', 'name');

    await notifyAllExceptAdmin(
      `New note added to lead "${lead.leadDetails.clientName}" by ${req.user.name}.`,
      `/leadDetails?leadId=${lead._id}`
    );

    res.status(200).json({ message: 'Note added', notes: updatedLead.notes });
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({ message: 'Failed to add note', error: error.message });
  }
};

exports.markLeadAsDead = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    // Mark as dead
    lead.lifecycleStatus = 'dead';
    lead.deletedAt = new Date();

    // Optional: Add a final note
    if (note && note.trim()) {
      lead.notes.unshift({
        text: note.trim(),
        addedBy: req.user._id,
        date: new Date()
      });
    }

    await lead.save();

    await notifyAllExceptAdmin(
      `Lead "${lead.leadDetails.clientName}" marked as Dead by ${req.user.name}.`,
      `/leadDetails?leadId=${lead._id}`
    );

    res.status(200).json({ message: 'Lead marked as dead', lead });
  } catch (err) {
    console.error('❌ Error marking lead as dead:', err.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};


// controllers/leadController.js

exports.getDeadLeads = async (req, res) => {
  try {
    const { status } = req.query; 
    const query = {
      createdBy: req.user.id  
    };

    if (status === 'dead') {
      query.lifecycleStatus = 'dead';
    } else if (status === 'active') {
      query.lifecycleStatus = 'active';
    }

    const leads = await Lead.find(query)
      .populate('createdBy', 'name email')
      .populate('forwardedTo.user', 'name email')
      .populate('followUps.by', 'name')
      .populate('notes.addedBy', 'name')
      .sort({ updatedAt: -1 });

    res.status(200).json({ leads });
  } catch (error) {
    console.error("Error fetching leads:", error);
    res.status(500).json({ message: "Failed to fetch leads" });
  }
};

//  lifecycleStatus of a lead (active/dead)
exports.updateLifecycleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { lifecycleStatus } = req.body;

    if (!['active', 'dead'].includes(lifecycleStatus)) {
      return res.status(400).json({ message: 'Invalid lifecycle status' });
    }

    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    lead.lifecycleStatus = lifecycleStatus;
    if (lifecycleStatus === 'dead') {
      lead.deletedAt = new Date();
    } else {
      lead.deletedAt = null;
    }

    await lead.save();
    res.status(200).json({ message: 'Lifecycle status updated', lead });
  } catch (err) {
    console.error('❌ Error updating lifecycle status:', err.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
