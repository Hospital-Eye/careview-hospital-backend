const router = require('express').Router();
const MP4Event = require('../models/MP4Event');
const MP4File = require('../models/MP4File');

// Webhook endpoint for CV service to send MP4 analytics events
router.post('/', async (req, res) => {
  try {
    const { secret, cameraId, type, ts, data } = req.body;
    
    // Verify secret (basic security)
    if (secret !== (process.env.CV_SHARED_SECRET || 'dev-secret')) {
      return res.status(401).json({ error: 'Invalid secret' });
    }

    // Extract filename from cameraId (format: mp4-filename)
    const filename = cameraId.replace('mp4-', '');
    
    // Validate MP4 file exists
    const mp4File = await MP4File.findOne({ filename });
    if (!mp4File) {
      return res.status(400).json({ error: 'MP4 file not found' });
    }

    // Create event
    const event = await MP4Event.create({
      mp4FileId: mp4File._id,
      filename: filename,
      type,
      ts: ts || Date.now(),
      data
    });

    // Update MP4 file analytics results if it's a completion event
    if (type === 'people-stats' && data) {
      await MP4File.findByIdAndUpdate(mp4File._id, {
        'analyticsResults.peopleCount': data.occupancy || 0,
        'analyticsResults.framesProcessed': data.frames_processed || 0
      });
    }

    res.json({ ok: true, eventId: event._id });
  } catch (e) {
    console.error('MP4 webhook error:', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Get recent MP4 events for a specific file
router.get('/recent/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const { limit = 10 } = req.query;
    
    const events = await MP4Event.find({ filename })
      .sort({ ts: -1 })
      .limit(Number(limit));
    
    res.json({ events });
  } catch (e) {
    console.error('Get MP4 events error:', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
