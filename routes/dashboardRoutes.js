// routes/dashboardRoutes.js
const express = require('express');
const { protect, authorize, scope } = require('../middleware/authMiddleware');
const router = express.Router();
const { getDashboardMetrics } = require('../controllers/dashboardController');

// Route to get all dashboard metrics
router.get('/', protect, authorize('admin', 'nurse', 'doctor', 'manager'), getDashboardMetrics);

module.exports = router;