const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const router = express.Router();
const {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask
} = require('../controllers/taskController');

router.post('/', protect, authorize('admin', 'doctor', 'nurse'), createTask);
router.get('/', protect, authorize('admin', 'doctor', 'nurse'), getTasks);
router.get('/:id', protect, authorize('admin', 'doctor', 'nurse'), getTaskById);
router.put('/:id', protect, authorize('admin', 'doctor', 'nurse'), updateTask);
router.delete('/:id', protect, authorize('admin', 'doctor'), deleteTask);

module.exports = router;
