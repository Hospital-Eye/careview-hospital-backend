// models/User.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
  // Google OAuth linkage (optional)
  googleId: { type: String, unique: true, sparse: true, index: true },

  // Identity
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name:  { type: String, required: true, trim: true },
  profilePicture: String,

  // Clinic & Organization
  clinicId: { type: String },
  organizationId: { type: String },

  // Access
  role: { type: String, enum: ['admin', 'manager', 'doctor', 'nurse', 'patient'], default: 'patient', required: true },
  isActive: { type: Boolean, default: true, required: true }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
