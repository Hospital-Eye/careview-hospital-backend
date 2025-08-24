const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  type: { type: String, required: true }, // e.g., "Patient Safety"
  title: { type: String, required: true }, // e.g., "CRITICAL: Fall Detected"
  severity: { type: String, enum: ['Low', 'Moderate', 'High', 'Critical'], required: true },
  source: {
    type: {
      type: String, required: true // e.g., "CV System"
    },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'CVDetection' }
  },
  recipients: [
    {
      staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
      acknowledgedAt: { type: Date, default: null }
    }
  ],
  status: { type: String, enum: ['Pending', 'Acknowledged', 'Resolved'], default: 'Pending' },
  timestamps: {
    created: { type: Date, default: Date.now },
    resolved: { type: Date, default: null }
  },
  associatedIds: {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' }
  },
  resolutionNotes: { type: String }
});

module.exports = mongoose.model('Alert', alertSchema);
