const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const router = express.Router();
const {
  createEvent,
  getEvents
} = require('../controllers/analyticsEventController');

router.post('/', protect, authorize('admin'), createEvent);
router.get('/', protect, authorize('admin'), getEvents);

module.exports = router;
