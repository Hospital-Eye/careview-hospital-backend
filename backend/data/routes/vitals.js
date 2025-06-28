const express = require('express');
const router = express.Router();
const {
  createVital,
  getVitals,
  getVitalById,
  updateVital,
  deleteVital
} = require('../controllers/vitalController');

router.post('/', createVital);
router.get('/', getVitals);
router.get('/:id', getVitalById);
router.put('/:id', updateVital);
router.delete('/:id', deleteVital);

module.exports = router;
