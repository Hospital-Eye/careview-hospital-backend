const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  roomNumber: String,
  status: {
    type: String,
    enum: ['stable', 'critical', 'discharged'],
    default: 'stable',
  },
  assignedStaff: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  admittedAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: Date,
  archetype: {
    type: String,
    enum: ['patient'],
    default: 'patient',
  },
});

module.exports = mongoose.model('Patient', patientSchema);
