const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  loginTime: {
    type: Date,
    required: true,
  },
  logoutTime: {
    type: Date,
    default: null,
  },
  ipAddress: {
    type: String,
    required: true,
  },
  device: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model('User', userSchema);
