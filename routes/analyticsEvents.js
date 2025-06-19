const express = require('express');
const router = express.Router();
const {
  createEvent,
  getEvents
} = require('../controllers/analyticsEventController');

router.post('/', createEvent);
router.get('/', getEvents);

module.exports = router;
