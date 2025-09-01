const express = require('express');
const { protect, authorize, scope } = require('../middleware/authMiddleware');
const router = express.Router();
const {
    createAdmission,
    getAdmissions,
    getAdmissionById,
    updateAdmission,
    deleteAdmission
} = require('../controllers/admissionController');

router.post('/', protect, authorize('admin', 'nurse', 'manager'), scope('Admission'), createAdmission);
router.get('/', protect, authorize('admin', 'nurse', 'manager', 'doctor'), scope('Admission'), getAdmissions);
router.get('/:id', protect, authorize('admin', 'nurse', 'manager', 'doctor'), scope('Admission'), getAdmissionById);
router.put('/:id', protect, authorize('admin', 'nurse', 'manager'), scope('Admission'), updateAdmission);
router.delete('/:id', protect, authorize('admin', 'manager'), scope('Admission'), deleteAdmission);

module.exports = router;