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

router.post('/', protect, authorize('admin'), scope('ComplianceAlert'), createAlert);
router.get('/', protect, authorize('admin', 'manager'), scope('ComplianceAlert'), getAlerts);
router.get('/:id', protect, authorize('admin', 'manager'), scope('ComplianceAlert'), getAlertById);
router.put('/:id', protect, authorize('admin', 'manager'), scope('ComplianceAlert'), updateAlert);
router.delete('/:id', protect, authorize('admin'), scope('ComplianceAlert'), deleteAlert);

module.exports = router;
