const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Patient = require('../models/Patient');
const { protect, authorize } = require('../middleware/authMiddleware');
require('dotenv').config();

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    let profileData = {
      name: user.name,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture
    };

    if (user.role === 'patient') {
      const patientDetails = await Patient.findOne({ userId: user._id });
      if (patientDetails) profileData.details = patientDetails;
    }

    res.status(200).json(profileData);
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
