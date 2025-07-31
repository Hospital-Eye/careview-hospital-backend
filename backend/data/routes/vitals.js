const express = require('express');
const router = express.Router();
const {
  createVital,
  getVitals,
  getVitalById,
  updateVital,
  deleteVital,
  getVitalsHistoryByPatientId
} = require('../controllers/vitalController');

router.post('/', createVital);
router.get('/', getVitals);
router.get('/:id', getVitalById);
router.put('/:id', updateVital);
router.delete('/:id', deleteVital);
//to display line chart
router.get('/history/:patientId', getVitalsHistoryByPatientId);

module.exports = router;
