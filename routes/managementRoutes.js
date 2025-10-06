const express = require('express');
const { protect, authorize, scope } = require('../middleware/authMiddleware');
const { createManager, createAdmin, getManagers, updateManager, deleteManager } = require('../controllers/managementController');

const router = express.Router();

router.post('/', protect, authorize('admin'), createAdmin);
router.post('/', protect, authorize('admin'), createManager);
router.get('/', protect, authorize('admin', 'manager'), scope('Management'), getManagers);
router.put('/:id', protect, authorize('admin'), scope('Management'), updateManager);
router.delete('/:id', protect, authorize('admin'), scope('Management'), deleteManager);

module.exports = router;
