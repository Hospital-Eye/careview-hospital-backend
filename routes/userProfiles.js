const express = require('express');
const { User, Patient, Staff, Clinic, Organization } = require('../models');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const email = req.user.email;

    const user = await User.findOne({
  where: { email },
  include: [
    { model: require('../models').Clinic, as: 'clinic' },
    { model: require('../models').Organization, as: 'organization' }
  ]
});

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
      const patientDetails = await Patient.findOne({ where: { userId: user.id } });
      profileData.details = patientDetails || null;
      profileData.organizationId = user.organizationId;
      profileData.clinicId = user.clinicId;
    } else {
      const staffDetails = await Staff.findOne({ where: { userId: user.id } });
      if (staffDetails) {
        profileData.details = staffDetails;
        profileData.employeeId = staffDetails.employeeId;
        profileData.organizationId = staffDetails.organizationId || user.organizationId;
        profileData.clinicId = staffDetails.clinicId || user.clinicId;
      } else {
        profileData.organizationId = user.organizationId;
        profileData.clinicId = user.clinicId;
      }
    }

    res.status(200).json(profileData);
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
