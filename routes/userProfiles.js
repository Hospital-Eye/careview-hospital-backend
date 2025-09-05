const express = require('express');
const User = require('../models/User');
const Patient = require('../models/Patient');
const { protect, authorize, scope } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/profile
// GET /api/profile?email=...
router.get('/', async (req, res) => {
  try {
    // Use query param if protect is removed
    const email = req.query.email;  
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email }).populate('clinic');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Base profile data
    const profileData = {
      name: user.name,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture || null,
    };

    // Attach patient-specific details if applicable
    if (user.role === 'patient') {
      const patientDetails = await Patient.findOne({ userId: user._id });
      if (patientDetails) {
        profileData.details = patientDetails;
      }
    }

    console.log('Fetched user from DB:', user);
    res.status(200).json(profileData);
  } catch (err) {
    console.error('Error fetching profile:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
