const mongoose = require('mongoose');

const cvDetectionSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  detectionType: { type: String, enum: ['person_in_room', 'fall_detected', 'bed_exit'] },
  confidence: Number,
  timestamp: { type: Date, default: Date.now },
  metadata: mongoose.Schema.Types.Mixed
});

module.exports = mongoose.model('CVDetection', cvDetectionSchema);
