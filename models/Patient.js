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
  emergencyContact: {
    name: String,
    relation: String,
    phone: String
  },
  admissionDate: Date,
  dischargeDate: Date,
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  admissionReason: String,
  diagnoses: [String],
  attendingPhysicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  acuityLevel: Number,
  status: String,
  carePlan: {
    assignedStaffIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Staff' }],
    notes: String,
    scheduledProcedures: [String],
    medicationSchedule: [String],
    dietaryRestrictions: String
  }
});

module.exports = mongoose.model('Patient', patientSchema);