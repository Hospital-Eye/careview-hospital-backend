const express = require('express');
// Import your middleware functions
const { protect, authorize, scope } = require('../middleware/authMiddleware');
const router = express.Router();
const {
  createPatient,
  getPatients,
  getPatientByMRN,
  updatePatientByMRN,
  deletePatientByMRN
} = require('../controllers/patientController');

router.post('/', protect, authorize('admin', 'manager', 'doctor'), createPatient);
router.get('/', protect, authorize('admin', 'manager', 'doctor', 'nurse'), scope('Patient'), getPatients);
router.get('/:mrn', protect, authorize('admin', 'manager', 'doctor', 'nurse'), scope('Patient'), getPatientByMRN);
router.put('/:mrn', protect, authorize('admin', 'manager', 'doctor'), scope('Patient'), updatePatientByMRN);
router.delete('/:mrn', protect, authorize('admin', 'manager'), scope('Patient'), deletePatientByMRN);

module.exports = router;
