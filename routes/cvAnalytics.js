// routes/cvAnalytics.js
const router = require('express').Router();
const c = require('../controllers/cvAnalyticsController');

// Start/stop/status control for CV tracking (Node -> Python cv-service)
router.post('/:cameraId/start',  c.startTracking);
router.post('/:cameraId/stop',   c.stopTracking);
router.get('/:cameraId/status',  c.statusTracking);

module.exports = router;
