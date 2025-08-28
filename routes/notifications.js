const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const router = express.Router();
const {
  createNotification,
  getNotifications
} = require('../controllers/notificationController');

router.post('/', protect, authorize('admin'), createNotification);
router.get('/', protect, authorize('admin'), getNotifications);

module.exports = router;
