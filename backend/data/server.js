const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

require('dotenv').config();
console.log('Value of process.env.PORT from .env:', process.env.PORT);
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.send('Hospital Eye API Running'));

app.use('/api/users', require('./routes/users'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/compliance-alerts', require('./routes/complianceAlerts'));
app.use('/api/analytics-events', require('./routes/analyticsEvents'));
app.use('/api/cv-detections', require('./routes/cvDetections'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/device-logs', require('./routes/deviceLogs'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/vitals', require('./routes/vitals'));
const cameraRoutes = require('./routes/cameraRoutes');
app.use('/api/cameras', cameraRoutes.router);
const admissionRoutes = require('./routes/admissionsRoutes');
app.use('/api/admissions', admissionRoutes);
// Clinic Dashboard - main dashboard
const dashboardRoutes = require('./routes/clinicDashboardRoutes');
app.use('/api/clinicdashboard', dashboardRoutes);

// Auto-start stream
const DEFAULT_RTSP = 'rtsp://admin:Sigma2812@47.149.131.62:554/Preview_01_main';
cameraRoutes.startStreamInternal(DEFAULT_RTSP);

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
