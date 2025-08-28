const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
<<<<<<< HEAD
  employeeId: { type: String, required: true, unique: true },
=======
  employeeId: { type: Number, required: true, unique: true },
>>>>>>> dev
  name: { type: String, required: true },
  contact: {
    email: { type: String },
    phone: { type: String }
  },
  role: String,
  department: [String],
  shift: String,
  certifications: [String],
  specializations: [String],
  status: {
    type: String,
    enum: ['On-Duty', 'Off-Duty', 'Leave'],
    default: 'On-Duty'
  }
});

<<<<<<< HEAD
module.exports = mongoose.model('Staff', staffSchema);
=======
module.exports = mongoose.model('Staff', staffSchema, 'Staff');
>>>>>>> dev
