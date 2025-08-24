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
  emailId: { type: String, required: true }
});

// ✅ Virtual relationship to admissions
patientSchema.virtual("admissions", {
  ref: "Admission",          // The model to use
  localField: "_id",         // Patient._id
  foreignField: "patientId"  // Admission.patientId
});

// ✅ Ensure virtuals show up in JSON & objects
patientSchema.set("toObject", { virtuals: true });
patientSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model('Patient', patientSchema);
