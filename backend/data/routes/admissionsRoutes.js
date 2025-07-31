const express = require('express');
const router = express.Router();
const {
    createAdmission,
    getAdmissions,
    getAdmissionById,
    updateAdmission,
    deleteAdmission
} = require('../controllers/admissionController');

router.post('/', createAdmission);
router.get('/', getAdmissions);
router.get('/:id', getAdmissionById);
router.put('/:id', updateAdmission);
router.delete('/:id', deleteAdmission);

module.exports = router;