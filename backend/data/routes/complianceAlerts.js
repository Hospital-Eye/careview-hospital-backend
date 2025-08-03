const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const router = express.Router();
const {
  createAlert,
  getAlerts,
  getAlertById,
  updateAlert,
  deleteAlert
} = require('../controllers/complianceAlertController');

router.post('/', protect, authorize('admin'), createAlert);
router.get('/', protect, authorize('admin'), getAlerts);
router.get('/:id', protect, authorize('admin'), getAlertById);
router.put('/:id', protect, authorize('admin'), updateAlert);
router.delete('/:id', protect, authorize('admin'), deleteAlert);

module.exports = router;
