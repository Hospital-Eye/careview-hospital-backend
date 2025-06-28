const express = require('express');
const router = express.Router();
const {
  createAlert,
  getAlerts,
  getAlertById,
  updateAlert,
  deleteAlert
} = require('../controllers/complianceAlertController');

router.post('/', createAlert);
router.get('/', getAlerts);
router.get('/:id', getAlertById);
router.put('/:id', updateAlert);
router.delete('/:id', deleteAlert);

module.exports = router;
