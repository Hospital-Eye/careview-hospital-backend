const express = require('express');
const Patient = require('../models/Patient');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/my-health
// GET /api/my-health
router.get('/', protect, authorize('patient'), async (req, res) => {
  try {
    // Find the patient linked to the logged-in user
    const patient = await Patient.findOne({ userId: req.user.id });
    if (!patient) {
      return res.status(404).json({ message: 'Patient data not found' });
    }

    // Fetch vitals history (will be [] if no data exists)
    const vitalsHistory = await Vital.find({ mrn: patient.mrn })
      .sort({ timestamp: -1 })
      .populate('recordedBy', 'name');

    // Convert patient to object
    const patientDetails = patient.toObject();

    // Always include vitalsHistory (even if empty)
    patientDetails.vitalsHistory = vitalsHistory;

    // Respond like your current structure
    res.json({
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      organizationId: req.user.organizationId || null,
      clinicId: req.user.clinicId || null,
      profilePicture: req.user.profilePicture || null,
      details: patientDetails,   // vitalsHistory now included here
    });
  } catch (err) {
    console.error('Error fetching patient health:', err);
    res.status(500).json({ message: 'Server error' });
  }
});



module.exports = router;
