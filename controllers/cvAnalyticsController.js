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

// POST /api/cv-analytics/:cameraId/start
exports.startTracking = async (req, res) => {
  const endpoint = 'startTracking';
  const { cameraId } = req.params;

  try {
    logger.info(`[${endpoint}] Start request for cameraId=${cameraId}`);

    const cam = await Camera.findByPk(cameraId);
    if (!cam) {
      logger.warn(`[${endpoint}] Camera not found: cameraId=${cameraId}`);
      return res.status(404).json({ error: 'Camera not found' });
    }

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

    logger.debug(`[${endpoint}] Sending request to CV service: ${JSON.stringify(body)}`);
    const r = await fetch(`${CV_URL}/track/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await r.json();
    if (!r.ok) {
      logger.warn(`[${endpoint}] CV service returned error for cameraId=${cameraId}`, { status: r.status, response: data });
      return res.status(r.status).json(data);
    }

    logger.info(`[${endpoint}] Tracking started successfully for cameraId=${cameraId}`);
    return res.json({ ok: true, ...data });
  } catch (e) {
    logger.error(`[${endpoint}] Error starting tracking for cameraId=${cameraId}: ${e.stack}`);
    return res.status(500).json({ error: 'server error' });
  }
};

// POST /api/cv-analytics/:cameraId/stop
exports.stopTracking = async (req, res) => {
  const endpoint = 'stopTracking';
  const { cameraId } = req.params;

  try {
    logger.info(`[${endpoint}] Stop request for cameraId=${cameraId}`);

    const r = await fetch(`${CV_URL}/track/stop/${cameraId}`, { method: 'POST' });
    const data = await r.json();

    if (!r.ok) {
      logger.warn(`[${endpoint}] CV service returned error for cameraId=${cameraId}`, { status: r.status, response: data });
      return res.status(r.status).json(data);
    }

    logger.info(`[${endpoint}] Tracking stopped successfully for cameraId=${cameraId}`);
    return res.json({ ok: true, ...data });
  } catch (e) {
    logger.error(`[${endpoint}] Error stopping tracking for cameraId=${cameraId}: ${e.stack}`);
    return res.status(500).json({ error: 'server error' });
  }
};

// GET /api/cv-analytics/:cameraId/status
exports.statusTracking = async (req, res) => {
  const endpoint = 'statusTracking';
  const { cameraId } = req.params;

  try {
    logger.info(`[${endpoint}] Status request for cameraId=${cameraId}`);

    const r = await fetch(`${CV_URL}/track/status/${cameraId}`);
    const data = await r.json();

    if (!r.ok) {
      logger.warn(`[${endpoint}] CV service returned error for cameraId=${cameraId}`, { status: r.status, response: data });
      return res.status(r.status).json(data);
    }

    logger.info(`[${endpoint}] Retrieved status successfully for cameraId=${cameraId}`);
    return res.json(data);
  } catch (e) {
    logger.error(`[${endpoint}] Error fetching status for cameraId=${cameraId}: ${e.stack}`);
    return res.status(500).json({ error: 'server error' });
  }
};
