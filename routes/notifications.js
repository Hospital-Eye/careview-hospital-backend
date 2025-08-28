const express = require('express');
<<<<<<< HEAD
=======
const { protect, authorize } = require('../middleware/authMiddleware');
>>>>>>> dev
const router = express.Router();
const {
  createNotification,
  getNotifications
} = require('../controllers/notificationController');

<<<<<<< HEAD
router.post('/', createNotification);
router.get('/', getNotifications);
=======
router.post('/', protect, authorize('admin'), createNotification);
router.get('/', protect, authorize('admin'), getNotifications);
>>>>>>> dev

module.exports = router;
