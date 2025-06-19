const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true },
  name: String,
  role: { type: String, enum: ['doctor', 'nurse', 'admin', 'visitor', 'technician'] },
  authProvider: String,
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date
});

module.exports = mongoose.model('User', userSchema);
