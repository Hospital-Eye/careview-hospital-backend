// controllers/cvAnalyticsController.js
// Node 18+ has global fetch. If you're on older Node, install node-fetch and use:
// const fetch = (...a) => import('node-fetch').then(({default: f}) => f(...a));

const Camera = require('../models/Camera');

const CV_SHARED_SECRET   = process.env.CV_SHARED_SECRET   || 'dev-secret';
const CV_URL             = process.env.CV_URL             || 'http://localhost:8001';        // FastAPI service
const PUBLIC_BACKEND_URL = process.env.PUBLIC_BACKEND_URL || 'http://localhost:3000';        // this Node API

function buildRtsp(cam, { channel = cam.defaultChannel, stream = cam.defaultStream } = {}) {
  const ch = String((channel ?? 0) + 1).padStart(2, '0');        // 01/02/...
  const st = (stream === 'main' ? 'main' : 'sub');               // default to sub
  const u  = encodeURIComponent(cam?.auth?.username || '');
  const p  = encodeURIComponent(cam?.auth?.password || '');
  return `rtsp://${u}:${p}@${cam.ip}:${cam.rtspPort}/h264Preview_${ch}_${st}`;
}

// POST /api/cv-analytics/:cameraId/start
exports.startTracking = async (req, res) => {
  try {
    const { cameraId } = req.params;
    const cam = await Camera.findById(cameraId);
    if (!cam) return res.status(404).json({ error: 'Camera not found' });

    // optional overrides from request body
    const { channel, stream, line, zone, conf, imgsz, frame_skip, model } = req.body || {};
    const rtsp = buildRtsp(cam, { channel, stream });

    // Ensure stream is running and get its HLS URL
    let hls = `/streams/${cameraId}/index.m3u8`;
    try {
      const startResp = await fetch(`${PUBLIC_BACKEND_URL}/api/cameras/${cameraId}/start`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, stream })
      });
      const startData = await startResp.json();
      if (startData?.hls) hls = startData.hls.startsWith('/') ? startData.hls : `/${startData.hls}`;
    } catch {}

    const body = {
      cameraId,
      rtsp,
      hlsUrl: `${PUBLIC_BACKEND_URL}${hls}`,
      webhook: `${PUBLIC_BACKEND_URL}/api/cv-events`,
      secret: CV_SHARED_SECRET,
      ...(line ? { line } : {}),
      ...(zone ? { zone } : {}),
      ...(conf ? { conf } : {}),
      ...(imgsz ? { imgsz } : {}),
      ...(frame_skip ? { frame_skip } : {}),
      ...(model ? { model } : {}),
    };

    const r = await fetch(`${CV_URL}/track/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json(data);
    return res.json({ ok: true, ...data });
  } catch (e) {
    console.error('startTracking error:', e);
    return res.status(500).json({ error: 'server error' });
  }
};

// POST /api/cv-analytics/:cameraId/stop
exports.stopTracking = async (req, res) => {
  try {
    const { cameraId } = req.params;
    const r = await fetch(`${CV_URL}/track/stop/${cameraId}`, { method: 'POST' });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json(data);
    return res.json({ ok: true, ...data });
  } catch (e) {
    console.error('stopTracking error:', e);
    return res.status(500).json({ error: 'server error' });
  }
};

// GET /api/cv-analytics/:cameraId/status
exports.statusTracking = async (req, res) => {
  try {
    const { cameraId } = req.params;
    const r = await fetch(`${CV_URL}/track/status/${cameraId}`);
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json(data);
    return res.json(data);
  } catch (e) {
    console.error('statusTracking error:', e);
    return res.status(500).json({ error: 'server error' });
  }
};
