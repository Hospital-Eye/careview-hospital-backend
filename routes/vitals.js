const express = require('express');
const { protect, authorize, scope } = require('../middleware/authMiddleware');
const router = express.Router();
const {
  createVital,
  getVitals,
  getVitalById,
  updateVital,
  deleteVital,
  getVitalsHistoryByPatientId
} = require('../controllers/vitalController');

router.post('/', protect, authorize('admin', 'doctor', 'manager', 'nurse'), scope('Vital'), createVital);
router.get('/', protect, authorize('admin', 'doctor', 'manager', 'nurse'), scope('Vital'), getVitals);
router.get('/:id', protect, authorize('admin', 'doctor', 'manager', 'nurse'), scope('Vital'), getVitalById);
router.put('/:id', protect, authorize('admin', 'doctor', 'manager', 'nurse'), scope('Vital'), updateVital);
router.delete('/:id', protect, authorize('admin', 'doctor', 'manager'), scope('Vital'), deleteVital);


//to display line chart + vitals history
router.get('/history/:patientId', protect, async (req, res, next) => {

  const allowedRoles = ['admin', 'doctor', 'manager', 'nurse'];
  const requestedPatientId = req.params.patientId;

  // If logged-in user is a patient
  if (req.user.role === 'patient') {
    const { Patient } = require('../models');

    // Find patient record belonging to this user
    const patient = await Patient.findOne({
      where: { userId: req.user.id }
    });

    if (!patient) {
      return res.status(404).json({
        error: 'No patient record associated with this login.'
      });
    }

    // Check if patient is trying to access someone else’s records
    if (patient.id.toString() !== requestedPatientId) {
      return res.status(403).json({
        error: 'Patients can only view their own vitals history.'
      });
    }

    // Allowed → pass to controller
    return getVitalsHistoryByPatientId(req, res);
  }

  // If user is medical staff → verify role
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  // Staff allowed → send to controller
  return getVitalsHistoryByPatientId(req, res);
});


module.exports = router;
