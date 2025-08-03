const express = require('express');
const router = express.Router();
const {
  createStaff,
  getAllStaff,
  getStaffById,
  updateStaff,
  deleteStaff
} = require('../controllers/staffController');

router.post('/', protect, authorize('admin'), createStaff);
router.get('/', protect, authorize('admin'), getAllStaff);
router.get('/:id', protect, authorize('admin', 'doctor', 'nurse'), getStaffById);
router.put('/:id', protect, authorize('admin'), updateStaff);
router.delete('/:id', protect, authorize('admin'), deleteStaff);

module.exports = router;
