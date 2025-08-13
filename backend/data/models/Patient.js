const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  mrn: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  dob: { type: Date },
  gender: String,
  weight: {
    value: Number,
    unit: String
  },
  precautions: {
    type: String
  },
  emergencyContact: {
    name: String,
    relation: String,
    phone: String
  },
  status: { type: String, enum: ['Active', 'Discharged'], default: 'Active' },

});

module.exports = mongoose.model('Patient', patientSchema);