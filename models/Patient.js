const mongoose = require('mongoose');
const { Schema } = mongoose;

const patientSchema = new Schema({
  mrn: { type: String, required: true, unique: true },
  organizationId: { type: String, required: true },
  clinicId: { type: String, required: true },
  name: { type: String, required: true },
  dob: Date,
  gender: String,

  emailId: { type: String, required: true },

  //link to user if exists
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, sparse: true },

  precautions: String,
  allergies: [{ substance: String }],
  emergencyContact: {
    name: String,
    relation: String,
    phone: String
  },

  diagnoses: [String],

  // normalize to dev’s enum
  status: { type: String, enum: ['Active', 'Discharged'], default: 'Active' },

}, { timestamps: true });

// Virtual relationship to admissions (from dev)
patientSchema.virtual('admissions', {
  ref: 'Admission',
  localField: '_id',
  foreignField: 'patientId'
});

// Ensure virtuals appear in JSON/Object
patientSchema.set('toObject', { virtuals: true });
patientSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Patient', patientSchema);
