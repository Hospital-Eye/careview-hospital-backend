const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const db = require('./models');
const { initCleanupCron } = require('./utils/cleanup-cron');
const { logger } = require('./utils/logger');

dotenv.config();
const app = express();

app.use(cors());

// --- For Cal webhooks: capture raw body for signature verification ---
const calWebhookRoutes = require("./routes/calendarWebhookRoutes");
app.use("/api/webhooks", calWebhookRoutes);

// --- For all other routes ---
app.use(
  express.json({
    limit: '2mb',
  })
);

//health check
app.get('/', (req, res) => res.send('Hospital Eye API Running'));

//API Routes
app.use('/api/clinics',           require('./routes/clinicRoutes'));
app.use('/api/users',             require('./routes/users'));
app.use('/api/patients',          require('./routes/patients'));
app.use('/api/tasks',             require('./routes/tasks'));
app.use('/api/compliance-alerts', require('./routes/complianceAlerts'));
app.use('/api/analytics-events',  require('./routes/analyticsEvents'));
app.use('/api/cv-detections',     require('./routes/cvDetections'));
app.use('/api/cv-analytics',      require('./routes/cvAnalytics'));
app.use('/api/cv-events',         require('./routes/cvEvents'));
app.use('/api/rooms',             require('./routes/rooms'));
app.use('/api/device-logs',       require('./routes/deviceLogs'));
app.use('/api/staff',             require('./routes/staff'));
app.use('/api/vitals',            require('./routes/vitals'));
app.use('/api/profile',           require('./routes/userProfiles'));
app.use('/api/admissions',        require('./routes/admissionsRoutes'));
app.use('/api/my-health',         require('./routes/myHealthRoutes'));
app.use('/api/management',        require('./routes/managementRoutes'));
app.use('/api/dashboard',         require('./routes/dashboardRoutes'));
app.use('/api/scans',             require('./routes/scanRoutes'));
app.use('/api/mp4-uploads',       require('./routes/mp4Uploads'));
app.use('/api/mp4-events',        require('./routes/mp4Events'));
app.use('/api/appointments',     require('./routes/appointmentRoutes'));

const callLogRoutes = require('./routes/callLogRoutes');
app.use('/api/retell', callLogRoutes({transporter: require('./utils/mailer'),}));

const path = require("path");
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

const camerasRoute = require('./routes/cameras');
app.use('/api/cameras', camerasRoute);

// --- Google auth routes ---
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REDIRECT_URI && FRONTEND_BASE_URL) {
  const authRoutes = require('./routes/authRoutes')(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
    FRONTEND_BASE_URL
  );
  app.use('/api/authRoutes', authRoutes);
} else {
  console.warn('⚠️ Google OAuth env not fully set; authRoutes disabled.');
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on port ${PORT}`);
});

//Initialize cleanup cron job for CVEvent and MP4Event TTL
connectDB().then(() => {
  initCleanupCron(db);
});
