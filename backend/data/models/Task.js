const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  description: { type: String, required: true },
  category: { type: String, required: true },
  status: {
    type: String,
    enum: ['Pending', 'In-Progress', 'Completed', 'Overdue'],
    default: 'Pending',
  },
  priority: {
    type: String,
    enum: ['Low', 'Normal', 'High', 'Urgent'],
    default: 'Normal',
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    default: null
  },
  assignedStaffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  timestamps: {
    created: { type: Date, default: Date.now },
    due: Date,
    completed: Date,
  },
  duration: {
    estimated: Number,
    actual: Number
  },
  dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  location: String
});

module.exports = mongoose.model('Task', taskSchema);
