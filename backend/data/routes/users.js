const express = require('express');
const router = express.Router();
const { createUser, getUsers, updateUser, deleteUser } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware'); // Import your middleware


router.post('/', protect, authorize('admin'), createUser); // Only admins can create users


router.get('/', protect, authorize('admin'), getUsers); // Only admins can get all users


router.patch('/:id', protect, authorize('admin', 'doctor', 'manager'), updateUser); // Any logged-in user can update their own, admin can update all. 


router.delete('/:id', protect, authorize('admin'), deleteUser); // Only admins can delete users

module.exports = router;