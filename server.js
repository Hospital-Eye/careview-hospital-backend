const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const path = require('path');

dotenv.config();
connectDB();

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
app.use('/api/analytics-events', require('./routes/analyticsEvents'));
app.use('/api/cv-detections', require('./routes/cvDetections'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/device-logs', require('./routes/deviceLogs'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/vitals', require('./routes/vitals'));
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
