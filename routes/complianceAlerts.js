const express = require('express');
const { protect, authorize, scope } = require('../middleware/authMiddleware');
const router = express.Router();
const {
  createAlert,
  getAlerts,
  getAlertById,
  updateAlert,
  deleteAlert
} = require('../controllers/complianceAlertController');

router.post('/', protect, authorize('admin', 'manager'), createAlert);
router.get('/', protect, authorize('admin', 'manager', 'doctor', 'nurse'), scope('ComplianceAlert'), getAlerts);
router.get('/:id', protect, authorize('admin', 'manager', 'doctor', 'nurse'), scope('ComplianceAlert'), getAlertById);
router.put('/:id', protect, authorize('admin', 'manager', 'doctor', 'nurse'), scope('ComplianceAlert'), updateAlert);
router.delete('/:id', protect, authorize('admin', 'manager'), scope('ComplianceAlert'), deleteAlert);

module.exports = router;
