const express = require('express');
<<<<<<< HEAD
const router = express.Router();
const roomController = require('../controllers/roomController');

router.post('/', roomController.createRoom);
router.get('/', roomController.getRooms);
router.get('/:id', roomController.getRoomById);
router.put('/:id', roomController.updateRoom);
router.delete('/:id', roomController.deleteRoom);
=======
const { protect, authorize } = require('../middleware/authMiddleware');
const router = express.Router();
const roomController = require('../controllers/roomController');

router.post('/', protect, authorize('admin'), roomController.createRoom);
router.get('/', protect, authorize('admin', 'doctor'), roomController.getRooms);
router.get('/:id', protect, authorize('admin', 'doctor'), roomController.getRoomById);
router.put('/:id', protect, authorize('admin'), roomController.updateRoom);
router.delete('/:id', protect, authorize('admin'), roomController.deleteRoom);
>>>>>>> dev

module.exports = router;