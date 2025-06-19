const mongoose = require('mongoose');

const deviceLogSchema = new mongoose.Schema({
  deviceId: { type: String, required: true },
  eventType: {
    type: String,
    enum: ['motion', 'fall', 'temperature', 'heartbeat', 'custom'],
    required: true
  },
  data: mongoose.Schema.Types.Mixed,
  recordedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DeviceLog', deviceLogSchema);