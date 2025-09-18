const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  organizationId: { type: String, required: true },
  clinicId: { type: String, required: true },

  description: { type: String, required: true },
  
  status: {
    type: String,
    enum: ['Pending', 'In-Progress', 'Completed', 'Overdue'],
    default: 'Pending',
  },

  // category: Patient-Related or General
  category: {
    type: String,
    enum: ['Patient-Related', 'General'], 
    required: true,
  },

  priority: {
    type: String,
    enum: ['Low', 'Normal', 'High', 'Urgent'],
    default: 'Normal',
  },

  //required field for Patient-Related Tasks
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: function() {
        return this.taskType === 'Patient-Related';
    },
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

  dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],

});

module.exports = mongoose.model('Task', taskSchema);
