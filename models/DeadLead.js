const mongoose = require('mongoose');
const deadLeadSchema = new mongooose.Schema({
    originalLeadId: {type:mongoose.Schema.Types.ObjectId, ref:'Lead'},
    leadDetails: Object,
    createdBy: {type:mongoose.Schema.Types.ObjectId, ref:'User'},
    forwardedTo: {
        user: {type:mongoose.Schema.Types.ObjectId, ref:'User'},
        forwardedAt: Date,
    },
    followUps: [Object],
    notes:[Object],
    remarksHistory: [Object],
    deletedAt: {type: Date, default: Date.now},
});

module.exports = mongoose.model('DeadLead', deadLeadSchema);
