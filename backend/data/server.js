const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

require('dotenv').config();
connectDB();


const app = express();
app.use(express.json());
app.use(cors({origin: '*'}));

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL;
const JWT_SECRET = process.env.JWT_SECRET;
const MONGODB_URI = process.env.MONGODB_URI;


// variable validation
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI || !FRONTEND_BASE_URL || !JWT_SECRET || !MONGODB_URI) {
    console.log("GOOGLE_CLIENT_ID:", GOOGLE_CLIENT_ID);
    console.log("GOOGLE_CLIENT_SECRET:", GOOGLE_CLIENT_SECRET);
    console.log("GOOGLE_REDIRECT_URI:", GOOGLE_REDIRECT_URI);
    console.log("FRONTEND_BASE_URL:", FRONTEND_BASE_URL);
    console.log("JWT_SECRET:", JWT_SECRET);
    console.log("MONGODB_URI:", MONGODB_URI);
    //console.error("CRITICAL ERROR: One or more required environment variables are missing!");
    process.exit(1); // Exit the application if critical variables are missing
}


//to pass env variables to authRoutes
const authRoutes = require('./routes/authRoutes')(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
    FRONTEND_BASE_URL
);


app.get('/', (req, res) => res.send('Hospital Eye API Running'));

app.use('/api/authRoutes', authRoutes);
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
app.use('/api/dashboard', dashboardRoutes);

// User profile
const userProfileRoutes = require('./routes/userProfiles');
app.use('/api/profile', userProfileRoutes);

// Auto-start stream
const DEFAULT_RTSP = 'rtsp://admin:Sigma2812@47.149.131.62:554/Preview_01_main';
cameraRoutes.startStreamInternal(DEFAULT_RTSP);

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
