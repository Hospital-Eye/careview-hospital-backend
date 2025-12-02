const express = require('express');
// Import your middleware functions
const { protect, authorize, scope } = require('../middleware/authMiddleware');
const router = express.Router();
const {
  createPatient,
  getPatients,
  getPatientByMRN,
  updatePatientByMRN,
  deletePatientByMRN,
  welcomeNewUser,
  registerUserAsPatient
} = require('../controllers/patientController');

router.post('/', protect, authorize('admin', 'manager', 'doctor'), createPatient);
router.get('/', protect, authorize('admin', 'manager', 'doctor', 'nurse'), scope('Patient'), getPatients);
router.get('/welcome', protect, authorize('user'), welcomeNewUser );
router.post('/register', protect, authorize('user'), registerUserAsPatient);
router.get('/:mrn', protect, authorize('admin', 'manager', 'doctor', 'nurse'), scope('Patient'), getPatientByMRN);
router.put('/:mrn', protect, authorize('admin', 'manager', 'doctor', 'nurse'), scope('Patient'), updatePatientByMRN);
router.delete('/:mrn', protect, authorize('admin', 'manager', 'doctor'), scope('Patient'), deletePatientByMRN);

module.exports = router;
