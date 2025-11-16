const { Camera } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { logger } = require('../utils/logger');

const CV_SHARED_SECRET   = process.env.CV_SHARED_SECRET   || 'dev-secret';
const CV_URL             = process.env.CV_URL             || 'http://localhost:8001';        
const PUBLIC_BACKEND_URL = process.env.PUBLIC_BACKEND_URL || 'http://localhost:3000';        

function buildRtsp(cam, { channel = cam.defaultChannel, stream = cam.defaultStream } = {}) {
  const ch = String((channel ?? 0) + 1).padStart(2, '0');        
  const st = (stream === 'main' ? 'main' : 'sub');               
  const u  = encodeURIComponent(cam?.auth?.username || '');
  const p  = encodeURIComponent(cam?.auth?.password || '');
  return `rtsp://${u}:${p}@${cam.ip}:${cam.rtspPort}/h264Preview_${ch}_${st}`;
}

//POST /api/cv-analytics/:cameraId/start
exports.startTracking = async (req, res) => {
  try {
    const { cameraId } = req.params;
    const cam = await Camera.findByPk(cameraId);
    if (!cam) return res.status(404).json({ error: 'Camera not found' });

    const { channel, stream, line, zone, conf, imgsz, frame_skip, model } = req.body || {};
    const rtsp = buildRtsp(cam, { channel, stream });

    const body = {
      cameraId,
      rtsp,
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

//POST /api/cv-analytics/:cameraId/stop
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

//GET /api/cv-analytics/:cameraId/status
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
