const express = require('express');
<<<<<<< HEAD
=======
const { protect, authorize } = require('../middleware/authMiddleware');
>>>>>>> dev
const router = express.Router();
const {
  createUser,
  getUsers,
  updateUser,
  deleteUser
} = require('../controllers/userController');

<<<<<<< HEAD
router.post('/', createUser);
router.get('/', getUsers);
router.patch('/:id', updateUser);
router.delete('/:id', deleteUser);
=======
router.post('/', protect, createUser);
router.get('/', protect, authorize('admin'), getUsers);
router.patch('/:id', protect, authorize('admin'), updateUser);
router.delete('/:id', protect, authorize('admin'), deleteUser);
>>>>>>> dev

module.exports = router;
