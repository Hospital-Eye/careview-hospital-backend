const express = require('express');
const Patient = require('../models/Patient');
const Vital = require('../models/Vital');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/my-health
router.get('/', protect, authorize('patient'), async (req, res) => {
  try {
    // Find the patient linked to the logged-in user
    const patient = await Patient.findOne({ userId: req.user.id });
    if (!patient) {
      return res.status(404).json({ message: 'Patient data not found' });
    }

    // Fetch vitals history (safe default [])
    const vitalsHistory = await Vital.find({ mrn: patient.mrn })
      .sort({ timestamp: -1 })
      .populate('recordedBy', 'name');

    const patientDetails = patient.toObject();
    patientDetails.vitalsHistory = vitalsHistory;

    res.json({
      name: req.user.name || patient.name,
      email: req.user.email,
      role: req.user.role,
      organizationId: req.user.organizationId || null,
      clinicId: req.user.clinicId || null,
      profilePicture: req.user.profilePicture || null,
      details: patientDetails,
    });
  } catch (err) {
    console.error('Error fetching patient health:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;

