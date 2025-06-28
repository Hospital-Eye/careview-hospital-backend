const mongoose = require('mongoose');

const vitalSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  timestamp: { type: Date, default: Date.now },
  measurements: {
    heartRate: Number,
    bloodPressure: {
      systolic: Number,
      diastolic: Number
    },
    respiratoryRate: Number,
    temperature: {
      value: Number,
      unit: String
    },
    oxygenSaturation: {
      value: Number,
      method: String
    },
    painScale: {
      value: Number,
      scale: String
    },
    weight: {
      value: Number,
      unit: String
    }
  },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  notes: String
});

module.exports = mongoose.model('Vital', vitalSchema);
