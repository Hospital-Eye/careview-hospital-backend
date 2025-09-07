const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  employeeId: { type: Number, required: true, unique: true },
  organizationId: { type: String, required: true },
  clinicId: { type: String, required: true },
  name: { type: String, required: true },
  contact: {
    email: { type: String },
    phone: { type: String }
  },
  role: String,
  department: [String],
  shift: String,
  certifications: [String],
  specializations: [String],
  status: {
    type: String,
    enum: ['On-Duty', 'Off-Duty', 'Leave'],
    default: 'On-Duty'
  }
});

module.exports = mongoose.model('Staff', staffSchema, 'Staff');
