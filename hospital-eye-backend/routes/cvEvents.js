// routes/cvEvents.js
const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const CVEvent = require('../models/CVEvent');

// Optional: if you want to update room occupancy live.
// If you don't have these models/fields, you can delete this block safely.
let Room, Camera;
try {
  Room = require('../models/Room');
  Camera = require('../models/Camera');
} catch (_) { /* optional models not present */ }

const SHARED_SECRET = process.env.CV_SHARED_SECRET || 'dev-secret';

/**
 * Canonical (deep) sort for stable JSON stringification.
 * Must match the Python side (json.dumps sort_keys=True, separators=(',', ':')).
 */
function deepSort(obj) {
  if (Array.isArray(obj)) return obj.map(deepSort);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const k of Object.keys(obj).sort()) out[k] = deepSort(obj[k]);
    return out;
  }
  return obj;
}

function canonicalStringify(o) {
  return JSON.stringify(deepSort(o)); // Node uses ',' ':' by default
}

function verifySig(unsignedPayload, sigHex) {
  try {
    const msg = canonicalStringify(unsignedPayload);
    const h = crypto.createHmac('sha256', SHARED_SECRET).update(msg).digest('hex');
    // timing-safe compare
    return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(sigHex || '', 'hex'));
  } catch {
    return false;
  }
}

/**
 * POST /api/cv-events
 * Body: { cameraId, ts, type, data, sig }
 */
router.post('/', async (req, res) => {
  try {
    const { sig, ...unsigned } = req.body || {};
    if (process.env.CV_DISABLE_SIG === '1') {
        // skip in local dev
      } else if (!verifySig(unsigned, sig)) {
        return res.status(401).json({ error: 'bad signature' });
      }
      

    // persist raw CV event
    await CVEvent.create(unsigned);

    // OPTIONAL: update derived state (e.g., room occupancy) if your schema supports it
    if (unsigned.type === 'people-stats' && Room && Camera) {
      const { cameraId, ts, data } = unsigned;
      // Example: Room has a 'camera' field referencing Camera _id, and an 'occupancy' number.
      try {
        await Room.updateOne(
          { camera: cameraId },
          { $set: { occupancy: Number(data?.occupancy ?? 0), occUpdatedAt: new Date(ts) } }
        );
      } catch (e) {
        // keep webhook hot; don't fail on derived update
        console.warn('Room occupancy update skipped:', e.message);
      }
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error('cv-events error:', e);
    return res.status(500).json({ error: 'server error' });
  }
});

/**
 * GET /api/cv-events/recent?cameraId=<id>&limit=100
 * Simple debug endpoint (remove or protect in prod).
 */
router.get('/recent', async (req, res) => {
  try {
    const { cameraId, limit = 100 } = req.query;
    const q = cameraId ? { cameraId } : {};
    const docs = await CVEvent.find(q).sort({ ts: -1 }).limit(Number(limit));
    res.json({ ok: true, events: docs });
  } catch (e) {
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
