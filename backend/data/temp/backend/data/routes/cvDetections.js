const express = require('express');
const router = express.Router();
const {
  createDetection,
  getDetections
} = require('../controllers/cvDetectionController');

router.post('/', createDetection);
router.get('/', getDetections);

module.exports = router;
