const mongoose = require('mongoose');

const complianceAlertSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message: String,
    category: { type: String, enum: ['hygiene', 'safety', 'equipment'] },
    timestamp: { type: Date, default: Date.now },
    resolved: { type: Boolean, default: false }
  });
  
  module.exports = mongoose.model('ComplianceAlert', complianceAlertSchema);