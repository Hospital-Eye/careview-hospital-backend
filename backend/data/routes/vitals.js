const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const router = express.Router();
const {
  createVital,
  getVitals,
  getVitalById,
  updateVital,
  deleteVital,
  getVitalsHistoryByPatientId
} = require('../controllers/vitalController');

router.post('/', protect, authorize('admin', 'doctor'), createVital);
router.get('/', protect, authorize('admin', 'doctor', 'nurse'), getVitals);
router.get('/:id', protect, authorize('admin', 'doctor', 'nurse'), getVitalById);
router.put('/:id', protect, authorize('admin', 'doctor'), updateVital);
router.delete('/:id', protect, authorize('admin'), deleteVital);
//to display line chart
router.get('/history/:patientId', protect, authorize('admin', 'doctor', 'nurse'), getVitalsHistoryByPatientId);

module.exports = router;
