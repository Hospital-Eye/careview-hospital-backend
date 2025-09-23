const mongoose = require('mongoose');
const { Schema } = mongoose;

const clinicSchema = new Schema({
  clinicId: { type: String, required: true },
  organizationId: {type: String, required: true},
  name: { type: String, required: true },
  registrationNumber: { type: String, required: true },
  dateOfEstablishment: Date,
  type: { type: String, enum: ['Diagnostic', 'Hospital', 'Clinic', 'Branch', 'Emergency Center', 'Medical Center', 'General Practice'], required: true },
  address: { type: String, required: true },
  /*
  location: {
    type: {
      type: String,
      enum: ["Point"]
    },
    /*
    coordinates: {
      type: [Number],  // [longitude, latitude]
      required: true
    }
  },*/
  contactEmail: { type: String, required: true },
  contactPhone: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Clinic', clinicSchema);