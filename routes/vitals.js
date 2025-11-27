const express = require('express');
const { protect, authorize, scope, patientCheck } = require('../middleware/authMiddleware');
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
router.delete('/:id', protect, authorize('admin', 'doctor', 'manager', 'nurse'), scope('Vital'), deleteVital);


//to display line chart + vitals history
router.get("/history/:patientId", protect, patientCheck, authorize("admin", "doctor", "manager", "nurse", "patient"), getVitalsHistoryByPatientId);


module.exports = router;
