// server.js (merged)
require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const path      = require('path');
const connectDB = require('./config/db');

// --- Env ---
const {
  PORT = 3000,
  MONGODB_URI,
  MONGO_URI,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  FRONTEND_BASE_URL,
} = process.env;

// --- DB first ---
connectDB();

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '2mb' }));

// (Optional) tiny request log
app.use((req, _res, next) => { console.log(`📥 ${req.method} ${req.url}`); next(); });

// --- Static: UI + HLS ---
app.use(express.static(path.join(__dirname, 'public')));
app.use('/streams', express.static(path.join(__dirname, 'public', 'streams')));

// --- Health ---
app.get('/', (_req, res) => res.send('Hospital Eye API Running'));

// --- Core routes ---
app.use('/api/users',             require('./routes/users'));
app.use('/api/patients',          require('./routes/patients'));
app.use('/api/tasks',             require('./routes/tasks'));
app.use('/api/notifications',     require('./routes/notifications'));
app.use('/api/compliance-alerts', require('./routes/complianceAlerts'));
app.use('/api/analytics-events',  require('./routes/analyticsEvents'));
app.use('/api/cv-detections',     require('./routes/cvDetections'));
app.use('/api/rooms',             require('./routes/rooms'));
app.use('/api/device-logs',       require('./routes/deviceLogs'));
app.use('/api/staff',             require('./routes/staff'));
app.use('/api/vitals',            require('./routes/vitals'));

// --- Cameras: support either file name ---
// Prefer cameraRoutes (if your module exports { router, startStreamInternal }), else fallback to older routes/cameras.js
let cameraModule;
try {
  cameraModule = require('./routes/cameraRoutes');
  app.use('/api/cameras', cameraModule.router);
} catch {
  console.warn('ℹ️  routes/cameraRoutes not found, using routes/cameras');
  app.use('/api/cameras', require('./routes/cameras'));
}

// --- CV webhooks / analytics (if present) ---
try { app.use('/api/cv-events',    require('./routes/cvEvents')); } 
catch { console.warn('ℹ️  /api/cv-events missing (skipped)'); }
try { app.use('/api/cv-analytics', require('./routes/cvAnalytics')); } 
catch { console.warn('ℹ️  /api/cv-analytics missing (skipped)'); }

// --- Google OAuth (optional) ---
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REDIRECT_URI && FRONTEND_BASE_URL) {
  const authRoutes = require('./routes/authRoutes')(
    GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, FRONTEND_BASE_URL
  );
  app.use('/api/authRoutes', authRoutes);
} else {
  console.warn('⚠️  Google OAuth env not fully set; authRoutes disabled.');
}

// --- Optional autostart stream via env ---
// Set AUTOSTART_RTSP=rtsp://user:pass@ip:port/h264Preview_01_sub
if (process.env.AUTOSTART_RTSP && cameraModule?.startStreamInternal) {
  try {
    cameraModule.startStreamInternal(process.env.AUTOSTART_RTSP);
    console.log('▶️  Autostarting RTSP:', process.env.AUTOSTART_RTSP);
  } catch (e) {
    console.error('❌ Autostart failed:', e.message);
  }
}

// --- Warn if DB envs missing ---
if (!MONGODB_URI && !MONGO_URI) {
  console.warn('⚠️  No MONGODB_URI/MONGO_URI set. connectDB() may fail.');
}

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
