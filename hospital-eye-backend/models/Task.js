const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  //tag to differentiate between patient-related vs general tasks
  taskType: {
      type: String,
      enum: ['Patient-Related', 'Operational'],
      required: true
    },

  description: { type: String, required: true },
  
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

  //required field for Operational Tasks
  category: {
    type: String,
    // This is the custom validation logic
    required: function() {
        return this.taskType === 'Operational';
    }
  },

  //required field for Patient-Related Tasks
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    // This is the custom validation logic
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
