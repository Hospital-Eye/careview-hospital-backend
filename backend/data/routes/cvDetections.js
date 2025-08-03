const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const router = express.Router();
const {
  createDetection,
  getDetections,
  getDetectionById,
  updateDetection,
  deleteDetection
} = require('../controllers/cvDetectionController');

router.post('/', protect, authorize('admin'), createDetection);
router.get('/', protect, authorize('admin'), getDetections);
router.get('/:id', protect, authorize('admin'), getDetectionById);
router.put('/:id', protect, authorize('admin'), updateDetection);
router.delete('/:id', protect, authorize('admin'), deleteDetection);

module.exports = router;
