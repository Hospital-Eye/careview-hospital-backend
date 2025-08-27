// server.js
require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const path      = require('path');
const connectDB = require('./config/db');

// --- Load env ---
const {
  PORT = 5050,
  NODE_ENV,
  // DB
  MONGODB_URI,
  MONGO_URI, // in case your connectDB uses this
  // Google OAuth (optional in dev)
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  FRONTEND_BASE_URL,
  // Streaming analytics (optional)
  CV_URL,
  PUBLIC_BACKEND_URL
} = process.env;

// --- Connect DB early (after env is loaded) ---
connectDB();

// --- App setup ---
const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// --- Serve static UI and HLS output ---
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

// --- Cameras (your module exporting { router, startStreamInternal }) ---
const cameraRoutes = require('./routes/cameraRoutes'); // keep your current file name
app.use('/api/cameras', cameraRoutes.router);

// --- CV webhooks / analytics (only if present) ---
try {
  app.use('/api/cv-events',    require('./routes/cvEvents'));
} catch (_) {
  console.warn('ℹ️  /api/cv-events route not found (skipping)');
}
try {
  app.use('/api/cv-analytics', require('./routes/cvAnalytics'));
} catch (_) {
  console.warn('ℹ️  /api/cv-analytics route not found (skipping)');
}

// --- Google OAuth routes (optional) ---
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REDIRECT_URI && FRONTEND_BASE_URL) {
  const authRoutes = require('./routes/authRoutes')(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
    FRONTEND_BASE_URL
  );
  app.use('/api/authRoutes', authRoutes);
} else {
  console.warn('⚠️  Google OAuth env not fully set; authRoutes disabled.');
}

// --- Optional autostart of a camera stream ---
// Set AUTOSTART_RTSP in .env to enable (avoid hard-coding inside source)
if (process.env.AUTOSTART_RTSP) {
  if (typeof cameraRoutes.startStreamInternal === 'function') {
    try {
      // TIP for Reolink: use 'h264Preview_01_sub' (H.264) for smooth direct copy.
      cameraRoutes.startStreamInternal(process.env.AUTOSTART_RTSP);
      console.log('▶️  Autostarting RTSP:', process.env.AUTOSTART_RTSP);
    } catch (e) {
      console.error('❌ Autostart failed:', e.message);
    }
  } else {
    console.warn('ℹ️  cameraRoutes.startStreamInternal not exported; autostart skipped.');
  }
}

// --- Warn if DB env mismatch ---
if (!MONGODB_URI && !MONGO_URI) {
  console.warn('⚠️  No MONGODB_URI/MONGO_URI set. connectDB() may fail.');
}

// --- Start server ---
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
