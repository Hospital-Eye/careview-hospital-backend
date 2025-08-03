const express = require('express');
const router = express.Router();
const {
  createDeviceLog,
  getDeviceLogs,
  getDeviceLogById,
  deleteDeviceLog
} = require('../controllers/deviceLogController');

router.post('/', protect, authorize('admin'), createDeviceLog);
router.get('/', protect, authorize('admin'), getDeviceLogs);
router.get('/:id', protect, authorize('admin'), getDeviceLogById);
router.delete('/:id', protect, authorize('admin'), deleteDeviceLog);

module.exports = router;
