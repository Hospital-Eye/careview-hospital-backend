const express = require('express');
const { protect, authorize, scope } = require('../middleware/authMiddleware');
const router = express.Router();
const {
  createUser,
  getUsers,
  updateUser,
  deleteUser,
  welcomeNewUser,
  registerUserAsPatient
} = require('../controllers/userController');

router.post('/', protect, createUser);
router.get('/', protect, authorize('admin', 'manager'), getUsers);
router.get('/welcome', protect, authorize('user'), welcomeNewUser );
router.post('/register', protect, authorize('user'), registerUserAsPatient);
router.patch('/:id', protect, authorize('admin', 'manager'), updateUser);
router.delete('/:id', protect, authorize('admin', 'manager'), deleteUser);

module.exports = router;
