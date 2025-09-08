const express = require('express');
const User = require('../models/User');
const Patient = require('../models/Patient');
const { protect, authorize, scope } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/profile
// profile.js
router.get('/', protect, async (req, res) => {
  try {
    const email = req.user.email;  // comes from JWT middleware

    const user = await User.findOne({ email }).populate('clinicId')
                                              .populate('organizationId');          
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const profileData = {
      name: user.name,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture || null,
    };

    if (user.role === 'patient') {
      const patientDetails = await Patient.findOne({ userId: user._id }).lean();
      profileData.details = patientDetails || null;
    }

    res.status(200).json(profileData);
  } catch (err) {
  console.error('Error fetching profile:', err); // full error, not just message
  res.status(500).json({ message: 'Server error', error: err.message });
}
});


module.exports = router;
