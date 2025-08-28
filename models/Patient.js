const mongoose = require('mongoose');
const { Schema } = mongoose;

const patientSchema = new Schema({
  mrn: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  dob: Date,
  gender: String,

  // from dev (many flows expect this)
  emailId: { type: String, required: true },

  weight: {
    value: Number,
    unit: String
  },
  precautions: String,
  allergies: [{ substance: String }],
  emergencyContact: {
    name: String,
    relation: String,
    phone: String
  },

  // from HEAD (clinical metadata kept for compatibility)
  admissionDate: Date,
  dischargeDate: Date,
  roomId: { type: Schema.Types.ObjectId, ref: 'Room' },
  admissionReason: String,
  diagnoses: [String],
  attendingPhysicianId: { type: Schema.Types.ObjectId, ref: 'Staff' },
  acuityLevel: Number,

  // normalize to dev’s enum
  status: { type: String, enum: ['Active', 'Discharged'], default: 'Active' },

  carePlan: {
    assignedStaffIds: [{ type: Schema.Types.ObjectId, ref: 'Staff' }],
    notes: String,
    scheduledProcedures: [String],
    medicationSchedule: [String],
    dietaryRestrictions: String
  }
}, { timestamps: true });

// ✅ Virtual relationship to admissions (from dev)
patientSchema.virtual('admissions', {
  ref: 'Admission',
  localField: '_id',
  foreignField: 'patientId'
});

// ✅ Ensure virtuals appear in JSON/Object
patientSchema.set('toObject', { virtuals: true });
patientSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Patient', patientSchema);
