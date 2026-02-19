const express = require('express');
const { protect, authorize, scope, patientCheck } = require('../middleware/authMiddleware');
const router = express.Router();

const {
    createClinic,
    getClinics,
    getClinicById,
    editClinic,
    deleteClinic,
    getRegistrationRequestsForClinic,
    updateRegistrationRequestStatus,
    convertUserToPatient
} = require('../controllers/clinicController');


router.post('/', protect, authorize('admin', 'manager'), createClinic);
router.get('/', protect, authorize('admin', 'manager', 'doctor', 'nurse', 'patient', 'user'), scope('Clinic'), getClinics);
router.get('/:id', protect, authorize('admin', 'manager', 'doctor'), scope('Clinic'), getClinicById);
router.put('/:id', protect, authorize('admin', 'manager'), scope('Clinic'), editClinic);
router.delete('/:id', protect, authorize('admin', 'manager'), scope('Clinic'), deleteClinic);
router.get('/:id/requests', protect, authorize('admin', 'manager', 'doctor', 'nurse'), 
            scope("PatientRegistrationRequest"), getRegistrationRequestsForClinic);
router.patch("/:id/requests/:requestId", protect, authorize("admin", "manager", "doctor", "nurse"), 
            scope("PatientRegistrationRequest"), updateRegistrationRequestStatus);
router.post("/:id/requests/:requestId/convert", protect, authorize("admin", "manager", "doctor", "nurse"), convertUserToPatient);


module.exports = router;