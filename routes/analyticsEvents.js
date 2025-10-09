const express = require('express');
const { protect, authorize, scope } = require('../middleware/authMiddleware');
const router = express.Router();
const {
  createEvent,
  getEvents
} = require('../controllers/analyticsEventController');

router.post('/', protect, authorize('admin', 'manager', 'doctor', 'nurse'), scope('AnalyticsEvent'), createEvent);
router.get('/', protect, authorize('admin', 'manager', 'doctor', 'nurse'), scope('AnalyticsEvent'), getEvents);

module.exports = router;
