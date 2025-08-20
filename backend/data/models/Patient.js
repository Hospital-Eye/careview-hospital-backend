const mongoose = require('mongoose');
const Schema = mongoose.Schema;

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

  allergies: [{
    substance: String,
  }],

  emergencyContact: {
    name: String,
    relation: String,
    phone: String
  },
  status: { type: String, enum: ['Active', 'Discharged'], default: 'Active' },
  emailId: { type: String, required: true },

});

module.exports = mongoose.model('Patient', patientSchema);