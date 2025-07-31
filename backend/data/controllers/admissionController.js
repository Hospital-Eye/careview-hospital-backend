// controllers/AdmissionController.js
const Admission = require('../models/Admissions');
const Patient = require('../models/Patient'); 

// Create a new admission and link it to the patient
const createAdmission = async (req, res) => {
    try {
        const admission = new Admission(req.body);
        const savedAdmission = await admission.save();

        // Update the Patient's currentAdmissionId field
        await Patient.findByIdAndUpdate(
            savedAdmission.patientId,
            { currentAdmissionId: savedAdmission._id },
            { new: true }
        );

        res.status(201).json(savedAdmission);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Get all admissions 
const getAdmissions = async (req, res) => {
    try {
        const admissions = await Admission.find().populate('patientId assignedRoomId admittedByStaffId attendingPhysicianId');
        res.json(admissions);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

// Get a single admission by ID
const getAdmissionById = async (req, res) => {
    try {
        const admission = await Admission.findById(req.params.id).populate('patientId assignedRoomId admittedByStaffId attendingPhysicianId');
        if (!admission) return res.status(404).json({ error: 'Admission not found' });
        res.json(admission);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Update an admission by ID
const updateAdmission = async (req, res) => {
    try {
        const updated = await Admission.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!updated) return res.status(404).json({ error: 'Admission not found' });
        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Delete an admission by ID
const deleteAdmission = async (req, res) => {
    try {
        const deleted = await Admission.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'Admission not found' });
        res.json({ message: 'Admission deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    createAdmission,
    getAdmissions,
    getAdmissionById,
    updateAdmission,
    deleteAdmission
};