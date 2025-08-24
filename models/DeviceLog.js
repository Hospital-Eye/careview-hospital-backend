const mongoose = require('mongoose');

const deviceLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  entity: {
    type: {
      type: String,
      required: true,
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    }
  },
  details: { type: String }
});

module.exports = mongoose.model('DeviceLog', deviceLogSchema);
