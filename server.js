const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const path = require("path");
const db = require('./models');
const { initCleanupCron } = require('./utils/cleanup-cron');

dotenv.config();


console.log("🔧 ENV CHECK:");
console.log("SMTP USER:", process.env.SMTP_USER);
console.log("SMTP PASS:", process.env.SMTP_PASS ? "OK" : "MISSING");
console.log("SMTP HOST:", process.env.SMTP_HOST);
console.log("SMTP PORT:", process.env.SMTP_PORT);


// Database + Cron Startup
connectDB().then(() => {
  initCleanupCron(db);
});

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

//debug logs
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});

//health check
app.get('/', (req, res) => res.send('Hospital Eye API Running'));


app.use('/api/clinics',          require('./routes/clinicRoutes'));
app.use('/api/users',            require('./routes/users'));
app.use('/api/patients',         require('./routes/patients'));
app.use('/api/tasks',            require('./routes/tasks'));
app.use('/api/notifications',    require('./routes/notifications'));
app.use('/api/compliance-alerts', require('./routes/complianceAlerts'));
app.use('/api/analytics-events', require('./routes/analyticsEvents'));
app.use('/api/cv-detections',    require('./routes/cvDetections'));
app.use('/api/rooms',            require('./routes/rooms'));
app.use('/api/device-logs',      require('./routes/deviceLogs'));
app.use('/api/staff',            require('./routes/staff'));
app.use('/api/vitals',           require('./routes/vitals'));
app.use('/api/profile',          require('./routes/userProfiles'));
app.use('/api/admissions',       require('./routes/admissionsRoutes'));
app.use('/api/my-health',        require('./routes/myHealthRoutes'));
app.use('/api/management',       require('./routes/managementRoutes'));
app.use('/api/dashboard',        require('./routes/dashboardRoutes'));

app.use('/api/scans',            require('./routes/scanRoutes'));
app.use('/api/cameras',          require('./routes/cameras'));
app.use('/api/cv-events',        require('./routes/cvEvents'));
app.use('/api/mp4-uploads',      require('./routes/mp4Uploads'));
app.use('/api/mp4-events',       require('./routes/mp4Events'));

//auth routes OAuth
const GOOGLE_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI  = process.env.GOOGLE_REDIRECT_URI;
const FRONTEND_BASE_URL    = process.env.FRONTEND_BASE_URL;

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


app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));
app.use(express.static(path.join(__dirname, 'public')));

//start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
