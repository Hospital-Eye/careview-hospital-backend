const mongoose = require('mongoose');

const MP4EventSchema = new mongoose.Schema({
  mp4FileId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'MP4File', 
    required: true,
    index: true 
  },
  filename: { 
    type: String, 
    required: true,
    index: true 
  },
  type: { 
    type: String, 
    enum: ['people-stats', 'enter', 'exit', 'processing-complete'], 
    index: true 
  },
  ts: { 
    type: Number, 
    index: true 
  },
  data: { 
    type: Object 
  }
}, { timestamps: true });

MP4EventSchema.index({ mp4FileId: 1, ts: -1 });
MP4EventSchema.index({ filename: 1, ts: -1 });

module.exports = mongoose.model('MP4Event', MP4EventSchema);
