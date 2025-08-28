const express = require('express');
<<<<<<< HEAD
=======
const { protect, authorize } = require('../middleware/authMiddleware');
>>>>>>> dev
const router = express.Router();
const {
  createStaff,
  getAllStaff,
  getStaffById,
  updateStaff,
  deleteStaff
} = require('../controllers/staffController');

<<<<<<< HEAD
router.post('/', createStaff);
router.get('/', getAllStaff);
router.get('/:id', getStaffById);
router.put('/:id', updateStaff);
router.delete('/:id', deleteStaff);
=======
router.post('/', protect, authorize('admin'), createStaff);
router.get('/', protect, authorize('admin'), getAllStaff);
router.get('/:id', protect, authorize('admin', 'doctor', 'nurse'), getStaffById);
router.put('/:id', protect, authorize('admin'), updateStaff);
router.delete('/:id', protect, authorize('admin'), deleteStaff);
>>>>>>> dev

module.exports = router;
