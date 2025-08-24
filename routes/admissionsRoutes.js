const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const router = express.Router();
const {
    createAdmission,
    getAdmissions,
    getAdmissionById,
    updateAdmission,
    deleteAdmission
} = require('../controllers/admissionController');

router.post('/', protect, authorize('admin', 'nurse'), createAdmission);
router.get('/', protect, authorize('admin', 'nurse'), getAdmissions);
router.get('/:id', protect, authorize('admin', 'nurse'), getAdmissionById);
router.put('/:id', protect, authorize('admin', 'nurse'), updateAdmission);
router.delete('/:id', protect, authorize('admin'), deleteAdmission);

module.exports = router;