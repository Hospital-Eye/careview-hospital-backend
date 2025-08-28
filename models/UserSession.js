// models/UserSession.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSessionSchema = new Schema({
  userId:     { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  loginTime:  { type: Date, required: true, default: Date.now },
  logoutTime: { type: Date, default: null },
  ipAddress:  { type: String },
  device:     { type: String }
}, { timestamps: true });

module.exports = mongoose.model('UserSession', userSessionSchema);
