const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
<<<<<<< HEAD
  description: { type: String, required: true },
  category: { type: String, required: true },
=======
  //tag to differentiate between patient-related vs general tasks
  taskType: {
      type: String,
      enum: ['Patient-Related', 'Operational'],
      required: true
    },

  description: { type: String, required: true },
  
>>>>>>> dev
  status: {
    type: String,
    enum: ['Pending', 'In-Progress', 'Completed', 'Overdue'],
    default: 'Pending',
  },
<<<<<<< HEAD
=======

>>>>>>> dev
  priority: {
    type: String,
    enum: ['Low', 'Normal', 'High', 'Urgent'],
    default: 'Normal',
  },
<<<<<<< HEAD
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    default: null
  },
=======

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

>>>>>>> dev
  assignedStaffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
<<<<<<< HEAD
=======

>>>>>>> dev
  timestamps: {
    created: { type: Date, default: Date.now },
    due: Date,
    completed: Date,
  },
<<<<<<< HEAD
  duration: {
    estimated: Number,
    actual: Number
  },
  dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  location: String
=======

  dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],

>>>>>>> dev
});

module.exports = mongoose.model('Task', taskSchema);
