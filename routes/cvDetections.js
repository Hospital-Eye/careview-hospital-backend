const express = require('express');
const { protect, authorize, scope } = require('../middleware/authMiddleware');
const router = express.Router();
const {
  createDetection,
  getDetections,
  getDetectionById,
  updateDetection,
  deleteDetection
} = require('../controllers/cvDetectionController');

router.post('/', protect, authorize('admin', 'manager'), scope('CVDetection'), createDetection);
router.get('/', protect, authorize('admin', 'manager'), scope('CVDetection'), getDetections);
router.get('/:id', protect, authorize('admin', 'manager'), scope('CVDetection'), getDetectionById);
router.put('/:id', protect, authorize('admin', 'manager'), scope('CVDetection'), updateDetection);
router.delete('/:id', protect, authorize('admin', 'manager'), scope('CVDetection'), deleteDetection);

module.exports = router;
