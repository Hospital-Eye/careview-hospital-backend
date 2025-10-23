const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const upload = require("./middleware/upload");
const db = require('./models');
const { initCleanupCron } = require('./utils/cleanup-cron');

dotenv.config();

// Initialize database connection
connectDB().then(() => {
  // Initialize cleanup cron job for CVEvent and MP4Event TTL
  initCleanupCron(db);
});

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' })); 

// Debug log all requests
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});

app.get('/', (req, res) => res.send('Hospital Eye API Running'));

// --- Health ---
app.get('/', (_req, res) => res.send('Hospital Eye API Running'));

// --- Core routes ---
app.use('/api/clinics',          require('./routes/clinicRoutes'));
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
app.use('/api/profile',     require('./routes/userProfiles'));

// --- Admissions routes ---
app.use('/api/admissions',        require('./routes/admissionsRoutes'));

// --- My Health routes ---
app.use('/api/my-health', require('./routes/myHealthRoutes'));

// --- Management routes ---
app.use('/api/management', require('./routes/managementRoutes'));

// --- Dashboard routes ---
app.use('/api/dashboard', require('./routes/dashboardRoutes'));

// -- CT Scan routes ---
app.use('/api/scans', require('./routes/scanRoutes'));

//to view actual file
const path = require("path");
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI
FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL

// --- auth routes for authentication ---
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REDIRECT_URI && FRONTEND_BASE_URL) {
  const authRoutes = require('./routes/authRoutes')(
    GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, FRONTEND_BASE_URL
  );
  app.use('/api/authRoutes', authRoutes);
} else {
  console.warn('⚠️  Google OAuth env not fully set; authRoutes disabled.');
}



// --- Management ----
const managementRoutes = require('./routes/managementRoutes');
app.use('/api/management', managementRoutes);
app.use('/api/analytics-events', require('./routes/analyticsEvents'));
app.use('/api/cv-analytics', require('./routes/cvAnalytics'));

const camerasRoute = require('./routes/cameras');
app.use('/api/cameras', camerasRoute);

try {
  const dashboardRoutes = require('./routes/dashboardRoutes');
  app.use('/api/dashboard', dashboardRoutes);
} catch { console.warn('ℹ️  /api/dashboard missing (skipped)'); }

app.use('/api/cv-events', require('./routes/cvEvents'));

// MP4 Upload and Analytics routes
app.use('/api/mp4-uploads', require('./routes/mp4Uploads'));
app.use('/api/mp4-events', require('./routes/mp4Events'));

// Serve uploaded MP4 files
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
