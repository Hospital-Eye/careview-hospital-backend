const express = require('express');
<<<<<<< HEAD
=======
const { protect, authorize } = require('../middleware/authMiddleware');
>>>>>>> dev
const router = express.Router();
const {
  createEvent,
  getEvents
} = require('../controllers/analyticsEventController');

<<<<<<< HEAD
router.post('/', createEvent);
router.get('/', getEvents);
=======
router.post('/', protect, authorize('admin'), createEvent);
router.get('/', protect, authorize('admin'), getEvents);
>>>>>>> dev

module.exports = router;
