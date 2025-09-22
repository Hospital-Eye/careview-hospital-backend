const express = require('express');
const { protect, authorize, scope } = require('../middleware/authMiddleware');
const router = express.Router();

const {
    createClinic,
    getClinics,
    getClinicById,
    editClinic,
    deleteClinic
} = require('../controllers/clinicController');


router.post('/', protect, authorize('admin', 'manager'), createClinic);
router.get('/', protect, authorize('admin', 'manager'), scope('Clinic'), getClinics);
router.get('/:id', protect, authorize('admin', 'manager'), scope('Clinic'), getClinicById);
router.put('/:id', protect, authorize('admin', 'manager'), scope('Clinic'), editClinic);
router.delete('/:id', protect, authorize('admin', 'manager'), scope('Clinic'), deleteClinic);

module.exports = router;