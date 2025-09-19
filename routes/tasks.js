const express = require('express');
const { protect, authorize, scope } = require('../middleware/authMiddleware');
const router = express.Router();
const {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask
} = require('../controllers/taskController');

router.post('/', protect, authorize('admin', 'doctor', 'manager'), createTask);
router.get('/', protect, authorize('admin', 'doctor', 'manager', 'nurse'), scope('Task'), getTasks);
router.get('/:id', protect, authorize('admin', 'doctor', 'manager', 'nurse'), scope('Task'), getTaskById);
router.put('/:id', protect, authorize('admin', 'doctor', 'manager', 'nurse'), scope('Task'), updateTask);
router.delete('/:id', protect, authorize('admin', 'doctor', 'manager'), scope('Task'), deleteTask);

module.exports = router;
