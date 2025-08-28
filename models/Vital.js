const mongoose = require('mongoose');

const vitalSchema = new mongoose.Schema({
<<<<<<< HEAD
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
=======
  patientId: { type: String, ref: 'Patient' },
  mrn: { type: String },
>>>>>>> dev
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
<<<<<<< HEAD
    }
=======
    },

    physicalDistress: String,
>>>>>>> dev
  },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  notes: String
});

module.exports = mongoose.model('Vital', vitalSchema);
