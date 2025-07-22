const express = require('express');
const router = express.Router();
const { createUser, getUsers, updateUser, deleteUser } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware'); // Import your middleware

// Example: How to apply authentication and authorization to your routes

// POST /api/users - Create a new user (e.g., by an admin, or public signup)
// If it's public signup, don't use 'protect'. If it's admin-only, use 'protect' and 'authorize'.
router.post('/', protect, authorize('admin'), createUser); // Example: Only admins can create users

// GET /api/users - Get all users
// Only authenticated users can view, and only admins can view ALL users
router.get('/', protect, authorize('admin'), getUsers); // Example: Only admins can get all users

// PATCH /api/users/:id - Update a specific user
// A user should be able to update their own profile, or an admin can update any
// This often requires more complex logic in the controller/middleware
router.patch('/:id', protect, authorize('admin', 'doctor', 'manager'), updateUser); // Example: Any logged-in user can update their own, admin can update all. Logic in controller.

// DELETE /api/users/:id - Delete a specific user
router.delete('/:id', protect, authorize('admin'), deleteUser); // Example: Only admins can delete users

module.exports = router;