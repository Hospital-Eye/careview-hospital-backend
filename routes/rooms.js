const express = require('express');
const { protect, authorize, scope } = require('../middleware/authMiddleware');
const router = express.Router();
const roomController = require('../controllers/roomController');

router.post('/', protect, authorize('admin', 'manager'), roomController.createRoom);
router.get('/', protect, authorize('admin', 'manager', 'doctor', 'nurse'), scope('Room'), roomController.getRooms);
router.get("/available", protect, authorize('admin', 'manager'), scope('Room'), roomController.getAvailableRooms);
router.get('/:id', protect, authorize('admin', 'manager', 'doctor', 'nurse'), scope('Room'), roomController.getRoomById);
router.put('/:id', protect, authorize('admin', 'manager'), scope('Room'), roomController.updateRoom);
router.delete('/:id', protect, authorize('admin', 'manager'), scope('Room'), roomController.deleteRoom);

module.exports = router;