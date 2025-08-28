const express = require('express');
<<<<<<< HEAD
=======
const { protect, authorize } = require('../middleware/authMiddleware');
>>>>>>> dev
const router = express.Router();
const {
  createDetection,
  getDetections,
  getDetectionById,
  updateDetection,
  deleteDetection
} = require('../controllers/cvDetectionController');

<<<<<<< HEAD
router.post('/', createDetection);
router.get('/', getDetections);
router.get('/:id', getDetectionById);
router.put('/:id', updateDetection);
router.delete('/:id', deleteDetection);
=======
router.post('/', protect, authorize('admin'), createDetection);
router.get('/', protect, authorize('admin'), getDetections);
router.get('/:id', protect, authorize('admin'), getDetectionById);
router.put('/:id', protect, authorize('admin'), updateDetection);
router.delete('/:id', protect, authorize('admin'), deleteDetection);
>>>>>>> dev

module.exports = router;
