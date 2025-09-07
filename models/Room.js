const mongoose = require('mongoose');
const Patient = require('./Patient');

const roomSchema = new mongoose.Schema({
  organizationId: { type: String, required: true },
  clinicId: { type: String, required: true },
  roomNumber: { type: String, required: true },
  unit: { type: String, required: true },
  roomType: { type: String, required: true },
  capacity: { type: Number, required: true },
  equipment: [String],
  cameraIds: [String],
  accessRestrictions: [String],
});

module.exports = mongoose.model('Room', roomSchema);

//isolation precaution as roomType
