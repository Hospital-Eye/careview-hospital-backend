const express = require('express');
<<<<<<< HEAD
=======
// Import your middleware functions
const { protect, authorize } = require('../middleware/authMiddleware');
>>>>>>> dev
const router = express.Router();
const {
  createPatient,
  getPatients,
  getPatientByMRN,
  updatePatientByMRN,
  deletePatientByMRN
} = require('../controllers/patientController');

<<<<<<< HEAD
router.post('/', createPatient);
router.get('/', getPatients);
router.get('/:mrn', getPatientByMRN);
router.put('/:mrn', updatePatientByMRN);
router.delete('/:mrn', deletePatientByMRN);
=======
router.post('/', protect, authorize('admin', 'doctor'), createPatient);
router.get('/', protect, authorize('admin', 'doctor', 'nurse'), getPatients);
router.get('/:mrn', protect, authorize('admin', 'doctor', 'nurse'), getPatientByMRN);
router.put('/:mrn', protect, authorize('admin', 'doctor'), updatePatientByMRN);
router.delete('/:mrn', protect, authorize('admin'), deletePatientByMRN);
>>>>>>> dev

module.exports = router;
