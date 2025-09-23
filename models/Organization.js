const mongoose = require('mongoose');
const { Schema } = mongoose;

const organizationSchema = new Schema({
  organizationId: { type: String, required: true },
  name: { type: String, required: true },
  registrationNumber: { type: String, required: true },
  dateOfEstablishment: Date,
  address: { type: String, required: true },
  location: {
    type: {
      type: String,
      enum: ["Point"],
      required: true
    },
    /*
    coordinates: {
      type: [Number],  // [longitude, latitude]
      required: true
    }*/
  },
  contactEmail: { type: String, required: true },
  contactPhone: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Organization', organizationSchema);
