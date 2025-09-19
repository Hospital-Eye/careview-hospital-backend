const express = require('express');
const { protect, authorize, scope } = require('../middleware/authMiddleware');
const router = express.Router();
const {
  createStaff,
  getAllStaff,
  getStaffById,
  updateStaff,
  deleteStaff
} = require('../controllers/staffController');

router.post('/', protect, authorize('admin', 'manager'), createStaff);
router.get('/', protect, authorize('admin', 'manager'), scope('Staff'), getAllStaff);
router.get('/:id', protect, authorize('admin', 'manager'), scope('Staff'), getStaffById);
router.put('/:id', protect, authorize('admin', 'manager'), scope('Staff'), updateStaff);
router.delete('/:id', protect, authorize('admin', 'manager'), scope('Staff'), deleteStaff);

module.exports = router;
