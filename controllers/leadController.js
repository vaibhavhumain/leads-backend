const Lead = require('../models/Lead');
const User = require('../models/User');
const notifyAllExceptAdmin = require('../config/createNotifications');
const sendLeadNotificationEmail = require('../utils/sendLeadNotificationEmail');
const TimerLog = require('../models/LeadTimerLog')
const mongoose = require("mongoose");
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
      status: leadDetails.status || 'Cold',
      lifecycleStatus: 'active',
      lastEditedAt: new Date(),
      lastEditedBy: req.user._id,
      editHistory: [{
        editedAt: new Date(),
        editedBy: req.user._id
      }]
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
    lead.editHistory.push({
  editedAt: new Date(),
  editedBy: req.user._id
});

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
    lead.editHistory.push({
  editedAt: new Date(),
  editedBy: req.user._id
});
 
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
    lead.editHistory.push({
  editedAt: new Date(),
  editedBy: req.user._id
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
    lead.editHistory.push({
  editedAt: new Date(),
  editedBy: req.user._id
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
    lead.lastEditedAt = new Date();
    lead.lastEditedBy = req.user._id;
    lead.editHistory.push({
      editedAt: new Date(),
      editedBy: req.user._id
    });

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
    lead.editHistory.push({
  editedAt: new Date(),
  editedBy: req.user._id
});
 
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
    lead.editHistory.push({
  editedAt: new Date(),
  editedBy: req.user._id
});

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
    lead.editHistory.push({
  editedAt: new Date(),
  editedBy: req.user._id
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
    lead.editHistory.push({
  editedAt: new Date(),
  editedBy: req.user._id
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
    lead.editHistory.push({
  editedAt: new Date(),
  editedBy: req.user._id
});

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
    lead.editHistory.push({
  editedAt: new Date(),
  editedBy: req.user._id
});
 
    await lead.save();

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
  const { _id } = req.body; // contact _id to be marked primary
  const { id } = req.params; // lead ID

  if (!_id) return res.status(400).json({ message: 'Contact _id is required' });

  try {
    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    const contacts = lead.leadDetails.contacts;
    if (!Array.isArray(contacts)) {
      return res.status(400).json({ message: 'No contacts found in this lead' });
    }

    let matched = false;
    contacts.forEach((c) => {
      if (c._id && c._id.toString() === _id) {
        c.isPrimary = true;
        matched = true;
      } else {
        c.isPrimary = false;
      }
    });

    if (!matched) {
      return res.status(404).json({ message: 'No contact matched the given _id' });
    }

    lead.editHistory.push({
  editedAt: new Date(),
  editedBy: req.user._id
});

    await lead.save();

    res.status(200).json({ message: 'Primary contact updated', contacts: lead.leadDetails.contacts });
  } catch (err) {
    console.error('Update contact error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


exports.filterLeads = async (req, res) => {
  const { date, connectionStatus, status, hasFollowUps, followUpDate } = req.query;

  try {
    const filter = {};
    if (req.user.role !== 'admin') {
      filter.createdBy = req.user._id;
    }

    let leads = await Lead.find(filter)
      .populate('createdBy', 'name email')
      .populate('forwardedTo.user', 'name email')
      .populate('remarksHistory.updatedBy', 'name email');

    // 💡 Filter by edit date using editHistory
    if (date) {
      const selected = new Date(date);
      const nextDay = new Date(selected);
      nextDay.setDate(selected.getDate() + 1);

      leads = leads.filter(l =>
        l.editHistory.some(h => h.editedAt >= selected && h.editedAt < nextDay)
      );
    }

    if (connectionStatus === 'Connected' || connectionStatus === 'Not Connected') {
      leads = leads.filter(l => l.connectionStatus === connectionStatus);
    }

    if (status === 'Hot' || status === 'Warm' || status === 'Cold') {
      leads = leads.filter(l => l.status === status);
    }

    if (hasFollowUps === 'true') {
      leads = leads.filter(l => Array.isArray(l.followUps) && l.followUps.length > 0);
    } else if (hasFollowUps === 'false') {
      leads = leads.filter(l => !Array.isArray(l.followUps) || l.followUps.length === 0);
    }

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
    const matchStage = {
      'followUps.0': { $exists: true }
    };

    if(req.user.role !== 'admin') 
    {
      matchStage.createdBy = req.user._id; 
    }
    const pipeline = [
      { $match: matchStage },
      { $unwind: '$followUps' },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$followUps.date'
            }
          }
        }
      },
      { $sort: { _id: -1 } }
    ];

    const dates = await Lead.aggregate(pipeline);
    res.status(200).json(dates.map((d) => d._id));
  } catch (err) {
    console.error('Error fetching follow-up dates:', err);
    res
      .status(500)
      .json({ message: 'Failed to fetch dates', error: err.message });
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
    lead.editHistory.push({
  editedAt: new Date(),
  editedBy: req.user._id
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
    lead.lifecycleUpdatedAt = new Date();

    // Optional: Add a final note
    if (note && note.trim()) {
      lead.notes.unshift({
        text: note.trim(),
        addedBy: req.user._id,
        date: new Date()
      });
    }
    lead.editHistory.push({
  editedAt: new Date(),
  editedBy: req.user._id
});
 
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
    const leads = await Lead.find({
      createdBy: req.user.id,
      lifecycleStatus: 'dead'
    })
      .populate('createdBy', 'name email')
      .populate('forwardedTo.user', 'name email')
      .populate('followUps.by', 'name')
      .populate('notes.addedBy', 'name')
      .sort({ updatedAt: -1 });

    res.status(200).json({ leads });
  } catch (error) {
    console.error("Error fetching dead leads:", error);
    res.status(500).json({ message: "Failed to fetch dead leads" });
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
  lead.lifecycleUpdatedAt = new Date();
} else {
  lead.lifecycleUpdatedAt = null;
}

    lead.editHistory.push({
  editedAt: new Date(),
  editedBy: req.user._id
});
 
    await lead.save();
    res.status(200).json({ message: 'Lifecycle status updated', lead });
  } catch (err) {
    console.error('❌ Error updating lifecycle status:', err.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};


exports.getEditedDates = async (req, res) => {
  try {
    const rawUserId = req.query.userId || req.user?._id || req.user?.id;
    if (!rawUserId) {
      return res.status(401).json({ message: "Unauthorized: userId missing" });
    }

    let matchStage;
    if (mongoose.Types.ObjectId.isValid(rawUserId)) {
      matchStage = { "editHistory.editedBy": new mongoose.Types.ObjectId(rawUserId) };
    } else {
      matchStage = { "editHistory.editedBy": rawUserId };
    }

    const dates = await Lead.aggregate([
      { $match: { "editHistory.0": { $exists: true } } },
      { $unwind: "$editHistory" },
      { $match: matchStage },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$editHistory.editedAt",
            },
          },
        },
      },
      { $sort: { _id: -1 } },
    ]);

    res.status(200).json(dates.map((d) => d._id));
  } catch (err) {
    console.error("❌ Error fetching edited dates:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch edited dates", error: err.message });
  }
};


exports.getLeadsEditedReport = async (req, res) => {
  try {
    const { date, startDate, endDate, userId } = req.query;
    if (!userId) return res.status(400).json({ message: 'userId is required' });

    let match = {};
if (mongoose.Types.ObjectId.isValid(userId)) {
  match['editHistory.editedBy'] = new mongoose.Types.ObjectId(userId);
} else {
  match['editHistory.editedBy'] = userId; // fallback if stored as string
}


    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      match['editHistory.editedAt'] = { $gte: start, $lt: end };
    } else if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      match['editHistory.editedAt'] = { $gte: start, $lte: end };
    } else {
      return res.status(400).json({ message: 'Provide either date or startDate & endDate' });
    }

    const leads = await Lead.find({ editHistory: { $elemMatch: match } })
      .populate('createdBy', 'name email')
      .populate('followUps.by', 'name')
      .populate('notes.addedBy', 'name');

    const leadsWithTimerLogs = await Promise.all(
      leads.map(async (lead) => {
        const timerLogs = await TimerLog.find({ lead: lead._id });
        return { ...lead.toObject(), timerLogs };
      })
    );

    res.status(200).json({ leads: leadsWithTimerLogs });
  } catch (err) {
    console.error('❌ Error fetching edited leads report:', err);
    res.status(500).json({ message: 'Failed to fetch leads', error: err.message });
  }
};

exports.updateContacts = async (req, res) => {
  const { contacts } = req.body;
  const { id } = req.params;

  if (!Array.isArray(contacts)) {
    return res.status(400).json({ message: 'Contacts must be an array' });
  }

  try {
    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    lead.leadDetails.contacts = contacts;
    lead.editHistory.push({
  editedAt: new Date(),
  editedBy: req.user._id
});

    await lead.save();
    
    res.status(200).json({ message: 'Contacts updated', contacts });
  } catch (error) {
    console.error('Update contacts error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getEditedLeads = async (req, res) => {
  try {
    const { startDate, endDate, date, userId } = req.query;

    const match = {};
    if (userId) {
      match['editHistory.editedBy'] = new mongoose.Types.ObjectId(userId);
    }

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      match['editHistory.editedAt'] = { $gte: start, $lt: end };
    } else if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      match['editHistory.editedAt'] = { $gte: start, $lte: end };
    }

    const leads = await Lead.find({ editHistory: { $elemMatch: match } })
      .populate("createdBy", "name email")
      .sort({ 'editHistory.editedAt': -1 });

    const leadsWithTimerLogs = await Promise.all(
      leads.map(async (lead) => {
        const timerLogs = await TimerLog.find({ lead: lead._id });
        return {
          ...lead.toObject(),
          timerLogs,
        };
      })
    );

    res.status(200).json({ leads: leadsWithTimerLogs });
  } catch (err) {
    console.error("Failed to fetch edited leads:", err);
    res.status(500).json({ message: "Could not fetch edited leads." });
  }
};


exports.getFollowUpSuggestions = async (req, res) => {
  try {
    const leads = await Lead.find({}, 'followUps');
    const notesSet = new Set();

    leads.forEach(lead => {
      (lead.followUps || []).forEach(fup => {
        if (fup.notes && fup.notes.trim()) {
          notesSet.add(fup.notes.trim());
        }
      });
    });

    const suggestions = Array.from(notesSet).sort((a, b) => a.localeCompare(b));
    res.status(200).json({ suggestions });
  } catch (err) {
    console.error('Error fetching follow-up suggestions:', err);
    res.status(500).json({ message: 'Failed to fetch follow-up suggestions' });
  }
};

exports.getFollowUpsByUser = async (req, res) => {
  const { userId, startDate, endDate } = req.query;
  if (!userId || !startDate || !endDate) {
    return res.status(400).json({ message: "Missing required parameters" });
  }
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  try {
    const leads = await Lead.find({
      followUps: {
        $elemMatch: {
          by: userId,
          date: { $gte: start, $lte: end }
        }
      }
    })
      .populate('createdBy', 'name email')
      .populate('followUps.by', 'name')
      .populate('notes.addedBy', 'name');

    res.status(200).json({ leads });
  } catch (err) {
    console.error("Error in getFollowUpsByUser:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getMyLeadCreationDates = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    const dates = await Lead.aggregate([
      { $match: { createdBy: userId } }, 
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    res.status(200).json(dates.map(d => d._id));
  } catch (err) {
    console.error('Error fetching your lead creation dates:', err);
    res.status(500).json({ message: 'Failed to fetch your lead creation dates' });
  }
};

function normalizeNumber(num) {
  if (!num) return null;
  let d = String(num).replace(/\D/g, ''); 
  if (d.startsWith('91')) d = d.slice(2); 
  d = d.replace(/^0+/, '');               
  return d || null;
}

exports.dedupeLeads = async (req, res) => {
  try {
    const { dryRun = true, since, createdByOnly = false } = req.body || {};

    const query = {};
    if (since) query.createdAt = { $gte: new Date(since) };
    if (createdByOnly && req.user?._id) query.createdBy = req.user._id;

    const leads = await Lead.find(query, {
      createdAt: 1,
      'leadDetails.contacts.number': 1,
    }).lean();

    const newestByPhone = new Map();
    const phonesByLead = new Map();

    for (const lead of leads) {
      const leadId = String(lead._id);
      const createdAt = new Date(lead.createdAt || 0).getTime();
      const contacts = lead?.leadDetails?.contacts || [];
      const phoneSet = new Set();

      for (const c of contacts) {
        const n = normalizeNumber(c?.number);
        if (!n) continue;
        phoneSet.add(n);

        const curr = newestByPhone.get(n);
        if (!curr || createdAt > curr.createdAt) {
          newestByPhone.set(n, { leadId, createdAt });
        }
      }

      phonesByLead.set(leadId, phoneSet);
    }

    const keepSet = new Set();
    for (const { leadId } of newestByPhone.values()) keepSet.add(leadId);

    const dupIds = [];
    for (const [leadId, phoneSet] of phonesByLead.entries()) {
      if (phoneSet.size === 0) continue; // skip leads without numbers
      let isKeeper = false;
      for (const p of phoneSet) {
        if (newestByPhone.get(p)?.leadId === leadId) { isKeeper = true; break; }
      }
      if (!isKeeper) dupIds.push(leadId);
    }

    const summary = {
      duplicatesFound: dupIds.length,
      sampleIds: dupIds.slice(0, 100),
      note: dupIds.length > 100 ? 'Showing first 100 IDs' : undefined
    };

    if (dryRun || dupIds.length === 0) {
      return res.json({ dryRun: true, ...summary });
    }

    const delRes = await Lead.deleteMany({ _id: { $in: dupIds } });
    return res.json({ dryRun: false, deleted: delRes.deletedCount });

  } catch (err) {
    console.error('dedupeLeads error:', err);
    return res.status(500).json({ message: 'Failed to dedupe leads', details: err.message });
  }
};

exports.deleteOwnLoadsAsDeveloper = async (req,res) => {
  try {
    if(req.user?.role !== 'developer')
    {
      return res.status(403).json({message:"only developers can use this"});
    }
    const {id} = req.params;
    const lead=await Lead.findById(id).select('createdBy leadDetails.clientName');
    if(!lead) return res.status(404).json({message:'Lead not found'});
    const isOwner = lead.createdBy?.toString() === req.user._id.toString();
    if(!isOwner) {
      return res.status(403).json({message:'You can delete only leads you created'});
    }
    await lead.deleteOne();
    await notifyAllExceptAdmin(
      `Lead "${lead.leadDetails?.clientName || id}" deleted by developer ${req.user.name}.`,
      `/dashboard`
    );

    return res.status(200).json({ message: 'Lead deleted successfully (developer-owned)' });
  } catch (err) {
    console.error('Developer delete error:', err);
    return res.status(500).json({ message: 'Error deleting lead', error: err.message });
  }
  }

exports.deleteOwnLeadsBulkAsDeveloper = async (req, res) => {
  try {
    if (req.user?.role !== 'developer') {
      return res.status(403).json({ message: 'Only developers can bulk delete their own leads' });
    }

    const {
      dryRun = true,
      startDate,  // optional: delete only within createdAt range
      endDate,    // optional
      status,     // optional: Hot/Warm/Cold
      lifecycleStatus // optional: active/dead
    } = req.body || {};

    const filter = { createdBy: req.user._id };

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const e = new Date(endDate);
        // include full end day
        e.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = e;
      }
    }

    if (status && ['Hot', 'Warm', 'Cold'].includes(status)) {
      filter.status = status;
    }

    if (lifecycleStatus && ['active', 'dead'].includes(lifecycleStatus)) {
      filter.lifecycleStatus = lifecycleStatus;
    }

    const total = await Lead.countDocuments(filter);
    if (dryRun) {
      const sample = await Lead.find(filter).select('_id leadDetails.clientName createdAt').limit(50).lean();
      return res.json({
        dryRun: true,
        totalCandidates: total,
        sample, // show first 50 so user can confirm
        note: total > 50 ? 'Sample limited to first 50' : undefined
      });
    }

    const result = await Lead.deleteMany(filter);
    await notifyAllExceptAdmin(
      `${req.user.name} (developer) bulk deleted ${result.deletedCount} of their own lead(s).`,
      '/dashboard'
    );

    return res.json({
      dryRun: false,
      deleted: result.deletedCount
    });
  } catch (err) {
    console.error('Developer bulk delete error:', err);
    return res.status(500).json({ message: 'Failed to bulk delete leads', error: err.message });
  }
};


// Get all leads created by a specific user (for Admin use)
exports.getLeadsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // 🔍 Fetch leads by user with full population
    const leads = await Lead.find({ createdBy: userId })
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email")
      .populate("forwardedTo.user", "name email")
      .populate("remarksHistory.updatedBy", "name email")
      .populate("followUps.by", "name email")
      .populate("notes.addedBy", "name email")
      .populate("activities.conductedBy", "name email")
      .sort({ createdAt: -1 });

    if (!leads || leads.length === 0) {
      return res.status(404).json({ message: "No leads found for this user" });
    }

    // 🔁 Attach timer logs for each lead
    const leadsWithTimers = await Promise.all(
      leads.map(async (lead) => {
        const timerLogs = await TimerLog.find({ lead: lead._id }).lean();
        return {
          ...lead.toObject(),
          timerLogs,
        };
      })
    );

    res.status(200).json(leadsWithTimers);
  } catch (error) {
    console.error("Error fetching leads by user:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
