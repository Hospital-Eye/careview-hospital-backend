// models/CVEvent.js
const mongoose = require('mongoose');

const cvEventSchema = new mongoose.Schema({
  cameraId: { type: mongoose.Schema.Types.ObjectId, ref: 'Camera', index: true },
  type: { type: String, enum: ['people-stats','enter','exit'], index: true },
  ts: { type: Number, index: true },           // epoch ms from cv-service
  data: { type: Object }                        // counts or track info
}, { timestamps: true });

cvEventSchema.index({ cameraId: 1, ts: -1 });
cvEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 72 * 3600 }); // TTL

module.exports = mongoose.model('CVEvent', cvEventSchema);
