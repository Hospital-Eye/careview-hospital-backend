const express = require('express');
const { protect, authorize, scope, patientCheck } = require('../middleware/authMiddleware');
const router = express.Router();
const {
    getAppointments,
    getAppointmentById,
    getAppointmentsByPatientId
} = require('../controllers/appointmentController');


router.get('/', protect, authorize('admin', 'nurse', 'manager', 'doctor'), scope('Appointment'), getAppointments);
router.get('/patient/:patientId', protect, patientCheck, authorize('admin', 'nurse', 'manager', 'doctor', 'patient'), scope('Appointment'), getAppointmentsByPatientId);
router.get('/:id', protect, patientCheck, authorize('admin', 'nurse', 'manager', 'doctor', 'patient'), scope('Appointment'), getAppointmentById);
module.exports = router;