const express = require('express');
// Import your middleware functions
const { protect, authorize } = require('../middleware/authMiddleware');
const router = express.Router();
const {
  createPatient,
  getPatients,
  getPatientByMRN,
  updatePatientByMRN,
  deletePatientByMRN
} = require('../controllers/patientController');

router.post('/', protect, authorize('admin', 'doctor'), createPatient);
router.get('/', protect, authorize('admin', 'doctor', 'nurse'), getPatients);
router.get('/:mrn', protect, authorize('admin', 'doctor', 'nurse'), getPatientByMRN);
router.put('/:mrn', protect, authorize('admin', 'doctor'), updatePatientByMRN);
router.delete('/:mrn', protect, authorize('admin'), deletePatientByMRN);

module.exports = router;
