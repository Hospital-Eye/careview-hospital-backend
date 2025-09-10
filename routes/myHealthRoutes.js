const express = require('express');
const Patient = require('../models/Patient');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/my-health
router.get('/', protect, authorize('patient'), async (req, res) => {
    try {
      const patient = await Patient.findOne({ userId: req.user.id });
      if (!patient) {
        return res.status(404).json({ message: 'Patient data not found' });
      }

      res.json(patient);
    } catch (err) {
      console.error('Error fetching patient health:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;
