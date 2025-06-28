const express = require('express');
const router = express.Router();
const {
  createDeviceLog,
  getDeviceLogs,
  getDeviceLogById,
  deleteDeviceLog
} = require('../controllers/deviceLogController');

router.post('/', createDeviceLog);
router.get('/', getDeviceLogs);
router.get('/:id', getDeviceLogById);
router.delete('/:id', deleteDeviceLog);

module.exports = router;
