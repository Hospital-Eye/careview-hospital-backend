const express = require('express');
<<<<<<< HEAD
=======
const { protect, authorize } = require('../middleware/authMiddleware');
>>>>>>> dev
const router = express.Router();
const {
  createDeviceLog,
  getDeviceLogs,
  getDeviceLogById,
  deleteDeviceLog
} = require('../controllers/deviceLogController');

<<<<<<< HEAD
router.post('/', createDeviceLog);
router.get('/', getDeviceLogs);
router.get('/:id', getDeviceLogById);
router.delete('/:id', deleteDeviceLog);
=======
router.post('/', protect, authorize('admin'), createDeviceLog);
router.get('/', protect, authorize('admin'), getDeviceLogs);
router.get('/:id', protect, authorize('admin'), getDeviceLogById);
router.delete('/:id', protect, authorize('admin'), deleteDeviceLog);
>>>>>>> dev

module.exports = router;
