const express = require('express');
<<<<<<< HEAD
const router = express.Router();
const {
  createTask,
  getAllTasks,
=======
const { protect, authorize } = require('../middleware/authMiddleware');
const router = express.Router();
const {
  createTask,
  getTasks,
>>>>>>> dev
  getTaskById,
  updateTask,
  deleteTask
} = require('../controllers/taskController');

<<<<<<< HEAD
router.post('/', createTask);
router.get('/', getAllTasks);
router.get('/:id', getTaskById);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);
=======
router.post('/', protect, authorize('admin', 'doctor', 'nurse'), createTask);
router.get('/', protect, authorize('admin', 'doctor', 'nurse'), getTasks);
router.get('/:id', protect, authorize('admin', 'doctor', 'nurse'), getTaskById);
router.put('/:id', protect, authorize('admin', 'doctor', 'nurse'), updateTask);
router.delete('/:id', protect, authorize('admin', 'doctor'), deleteTask);
>>>>>>> dev

module.exports = router;
