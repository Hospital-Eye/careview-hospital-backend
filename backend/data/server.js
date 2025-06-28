const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

dotenv.config();
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


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
