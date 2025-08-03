// routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const { getDashboardMetrics } = require('../controllers/clinicDashboardController');

// Route to get all dashboard metrics
router.get('/', protect, authorize('admin', 'doctor'), getDashboardMetrics);

module.exports = router;