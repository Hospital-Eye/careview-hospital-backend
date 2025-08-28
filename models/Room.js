const mongoose = require('mongoose');
<<<<<<< HEAD
=======
const Patient = require('./Patient');
>>>>>>> dev

const roomSchema = new mongoose.Schema({
  roomNumber: { type: String, required: true },
  unit: { type: String, required: true },
  roomType: { type: String, required: true },
  capacity: { type: Number, required: true },
  equipment: [String],
  cameraIds: [String],
  accessRestrictions: [String],
});

module.exports = mongoose.model('Room', roomSchema);
<<<<<<< HEAD
=======

//isolation precaution as roomType
>>>>>>> dev
