const mongoose = require('mongoose');

const MP4FileSchema = new mongoose.Schema({
  filename: { 
    type: String, 
    required: true, 
    unique: true 
  },
  originalName: { 
    type: String, 
    required: true 
  },
  filePath: { 
    type: String, 
    required: true 
  },
  size: { 
    type: Number, 
    required: true 
  },
  mimetype: { 
    type: String, 
    required: true 
  },
  analyticsStatus: {
    type: String,
    enum: ['idle', 'running', 'completed', 'error'],
    default: 'idle'
  },
  analyticsStartedAt: Date,
  analyticsStoppedAt: Date,
  analyticsResults: {
    peopleCount: Number,
    processingTime: Number,
    framesProcessed: Number
  }
}, { timestamps: true });

module.exports = mongoose.model('MP4File', MP4FileSchema);
