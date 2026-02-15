const express = require('express');
const { protect, authorize} = require('../middleware/authMiddleware');
const router = express.Router();

const {
    finalizeVoiceCall,
    identityCheck,
} = require('../controllers/voiceController');

// Voice onboarding / processing
router.post('/finalize', finalizeVoiceCall);
router.post('/identity-check', identityCheck);

module.exports = router;
