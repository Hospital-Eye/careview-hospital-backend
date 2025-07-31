const express = require('express');
const router = express.Router();
const {
  createPatient,
  getPatients,
  getPatientByMRN,
  updatePatientByMRN,
  deletePatientByMRN
} = require('../controllers/patientController');

router.post('/', createPatient);
router.get('/', getPatients);
router.get('/:mrn', getPatientByMRN);
router.patch('/:mrn', updatePatientByMRN);
router.delete('/:mrn', deletePatientByMRN);

module.exports = router;
