const express = require('express');
const { protect, authorize, scope } = require('../middleware/authMiddleware');
const router = express.Router();
const {
  createDeviceLog,
  getDeviceLogs,
  getDeviceLogById,
  deleteDeviceLog
} = require('../controllers/deviceLogController');

router.post('/', protect, authorize('admin', 'manager'), createDeviceLog);
router.get('/', protect, authorize('admin', 'manager'), scope('DeviceLog'), getDeviceLogs);
router.get('/:id', protect, authorize('admin', 'manager'), scope('DeviceLog'), getDeviceLogById);
router.delete('/:id', protect, authorize('admin', 'manager'), scope('DeviceLog'), deleteDeviceLog);

module.exports = router;
