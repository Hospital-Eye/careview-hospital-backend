// routes/dashboardRoutes.js
const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const router = express.Router();
const { getDashboardMetrics } = require('../controllers/clinicDashboardController');

// Route to get all dashboard metrics
router.get('/', protect, authorize('admin', 'nurse', 'patient'), getDashboardMetrics);

module.exports = router;