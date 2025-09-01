const mongoose = require('mongoose');
const { Schema } = mongoose;

const clinicSchema = new Schema({
  clinicId: { type: String, required: true },
  name: { type: String, required: true },
  registrationNumber: { type: String, required: true },
  dateOfEstablishment: Date,
  type: { type: String, enum: ['General Practice', 'Specialty', 'Diagnostic'], required: true },
  address: { type: String, required: true },
  location: {
    type: {
      type: String,
      enum: ["Point"],
      required: true
    },
    coordinates: {
      type: [Number],  // [longitude, latitude]
      required: true
    }
  },
  contactEmail: { type: String, required: true },
  contactPhone: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Clinic', clinicSchema);