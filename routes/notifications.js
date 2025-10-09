const express = require('express');
const { protect, authorize, scope } = require('../middleware/authMiddleware');
const router = express.Router();
const {
  createNotification,
  getNotifications
} = require('../controllers/notificationController');

router.post('/', protect, authorize('admin', 'manager'), createNotification);
router.get('/', protect, authorize('admin', 'manager'), getNotifications);

module.exports = router;
