const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  status: {
    type: String,
    enum: ['todo', 'in_progress', 'done'],
    default: 'todo',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },
  keywords: [String], // NLP extracted terms
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: Date,
});

module.exports = mongoose.model('Task', taskSchema);
