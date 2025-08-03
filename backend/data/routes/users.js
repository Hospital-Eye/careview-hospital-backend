const express = require('express');
const router = express.Router();
const {
  createUser,
  getUsers,
  updateUser,
  deleteUser
} = require('../controllers/userController');

router.post('/', protect, createUser);
router.get('/', protect, authorize('admin'), getUsers);
router.patch('/:id', protect, authorize('admin'), updateUser);
router.delete('/:id', protect, authorize('admin'), deleteUser);

module.exports = router;
