const express = require('express');
<<<<<<< HEAD
=======
const { protect, authorize } = require('../middleware/authMiddleware');
>>>>>>> dev
const router = express.Router();
const {
  createAlert,
  getAlerts,
  getAlertById,
  updateAlert,
  deleteAlert
} = require('../controllers/complianceAlertController');

<<<<<<< HEAD
router.post('/', createAlert);
router.get('/', getAlerts);
router.get('/:id', getAlertById);
router.put('/:id', updateAlert);
router.delete('/:id', deleteAlert);
=======
router.post('/', protect, authorize('admin'), createAlert);
router.get('/', protect, authorize('admin'), getAlerts);
router.get('/:id', protect, authorize('admin'), getAlertById);
router.put('/:id', protect, authorize('admin'), updateAlert);
router.delete('/:id', protect, authorize('admin'), deleteAlert);
>>>>>>> dev

module.exports = router;
