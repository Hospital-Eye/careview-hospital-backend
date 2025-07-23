require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
console.log('🧪 Loaded URI:', process.env.MONGODB_URI);
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
    console.error("CRITICAL ERROR: One or more required environment variables are missing!");
    process.exit(1); // Exit the application if critical variables are missing
}

//to pass env variables to authRoutes
const authRoutes = require('./routes/authRoutes')(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
    FRONTEND_BASE_URL,
    JWT_SECRET 
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


const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
