// models/Camera.js
const mongoose = require('mongoose');

const CameraSchema = new mongoose.Schema({
  name: { type: String, required: true },      // e.g. "ER Hallway 1"
  ip: { type: String, required: true },
  rtspPort: { type: Number, default: 554 },    // yours is 555
  auth: {
    username: { type: String, required: true },
    password: { type: String, required: true }, // TODO: encrypt in prod
  },
  defaultChannel: { type: Number, default: 0 },
  defaultStream: { type: String, enum: ['main','sub'], default: 'sub' },
  transport: { type: String, enum: ['tcp','udp','http'], default: 'tcp' },
  forceEncode: { type: Boolean, default: false }, // sub (H.264) => copy
  isActive: { type: Boolean, default: true },
  autostart: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Camera', CameraSchema);
