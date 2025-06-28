const express = require('express');
const router = express.Router();
const {
  createDetection,
  getDetections,
  getDetectionById,
  updateDetection,
  deleteDetection
} = require('../controllers/cvDetectionController');

router.post('/', createDetection);
router.get('/', getDetections);
router.get('/:id', getDetectionById);
router.put('/:id', updateDetection);
router.delete('/:id', deleteDetection);

module.exports = router;
