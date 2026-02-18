const express = require('express');
const router = express.Router();

const {
    handleRetellEvent,
    identityCheck,
} = require('../controllers/voiceController');

// Voice onboarding / processing
router.post('/retell/events', handleRetellEvent);
router.post('/identity-check', identityCheck);

module.exports = router;
