// routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const { getDashboardMetrics } = require('../controllers/clinicDashboardController');

// Route to get all dashboard metrics
router.get('/', getDashboardMetrics);

module.exports = router;