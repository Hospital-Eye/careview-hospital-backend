const mongoose = require('mongoose');

const cvDetectionSchema = new mongoose.Schema({
  timestamp: { type: Date, required: true },
  cameraId: { type: String, required: true },
  location: {
    unit: { type: String, required: true },
    roomNumber: { type: String, required: true }
  },
  detectionType: { type: String, required: true },
  confidence: { type: Number, required: true },
  personId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: false },
  boundingBox: {
    type: [Number], // [x, y, width, height]
    validate: arr => arr.length === 4
  },
  classification: {
    archetype: { type: String, required: true },
    activity: { type: String, required: true }
  },
  triggeredAlertId: { type: mongoose.Schema.Types.ObjectId, ref: 'Alert', default: null },
  metadata: {
    processingTimeMs: { type: Number }
  }
});

module.exports = mongoose.model('CVDetection', cvDetectionSchema);
