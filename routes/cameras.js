// // routes/cameras.js
// const express = require('express');
// const router = express.Router();
// const camera = require('../controllers/cameraController');

// // Start a stream
// // POST /api/cameras/stream/start
// // body: { ip, user, pass, id?, channel?, stream?('main'|'sub'), rtspPort?, useSystemFfmpeg?, forceEncode? }
// router.post('/stream/start', camera.startStream);

// // Stop a stream
// // POST /api/cameras/stream/stop/:id
// router.post('/stream/stop/:id', camera.stopStream);

// // Status
// // GET /api/cameras/stream/status/:id
// router.get('/stream/status/:id', camera.statusStream);

// module.exports = router;

// routes/cameras.js
const express = require('express');
const router = express.Router();
const camera = require('../controllers/cameraController');

/* ---------- CRUD (DB) ---------- */
// POST /api/cameras
router.post('/', camera.createCamera);

// GET /api/cameras
router.get('/', camera.listCameras);

// GET /api/cameras/:id
router.get('/:id', camera.getCamera);

// PATCH /api/cameras/:id
router.patch('/:id', camera.updateCamera);

// DELETE /api/cameras/:id
router.delete('/:id', camera.deleteCamera);

/* ---------- Streaming by camera ID (DB) ---------- */
// POST /api/cameras/:id/start
router.post('/:id/start', camera.startById);

// POST /api/cameras/:id/stop
router.post('/:id/stop', camera.stopById);

// GET /api/cameras/:id/status
router.get('/:id/status', camera.statusById);

/* ---------- Legacy endpoints (body-based) ---------- */
// POST /api/cameras/stream/start
router.post('/stream/start', camera.startStream);

// POST /api/cameras/stream/stop/:id
router.post('/stream/stop/:id', camera.stopStream);

// GET /api/cameras/stream/status/:id
router.get('/stream/status/:id', camera.statusStream);

module.exports = router;
