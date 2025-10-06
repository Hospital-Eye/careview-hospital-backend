const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const MP4File = require('../models/MP4File');

// Configure multer for MP4 uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'video/mp4') {
      cb(null, true);
    } else {
      cb(new Error('Only MP4 files are allowed'), false);
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Upload MP4 file
router.post('/upload', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({ error: err.message || 'File upload error' });
    }
    
    // Continue with the upload logic
    (async () => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log('File uploaded:', req.file);

        const mp4File = await MP4File.create({
          filename: req.file.filename,
          originalName: req.file.originalname,
          filePath: req.file.path,
          size: req.file.size,
          mimetype: req.file.mimetype
        });

        res.status(201).json({
          message: 'MP4 file uploaded successfully',
          file: mp4File
        });
      } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message || 'Upload failed' });
      }
    })();
  });
});

// Get all MP4 files
router.get('/files', async (req, res) => {
  try {
    const files = await MP4File.find().sort({ createdAt: -1 });
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// Get specific MP4 file
router.get('/files/:filename', async (req, res) => {
  try {
    const file = await MP4File.findOne({ filename: req.params.filename });
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.json(file);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch file' });
  }
});

// Delete MP4 file
router.delete('/files/:filename', async (req, res) => {
  try {
    const file = await MP4File.findOne({ filename: req.params.filename });
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete physical file
    if (fs.existsSync(file.filePath)) {
      fs.unlinkSync(file.filePath);
    }

    // Delete from database
    await MP4File.findByIdAndDelete(file._id);
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Start MP4 analytics
router.post('/analytics/:filename/start', async (req, res) => {
  try {
    const file = await MP4File.findOne({ filename: req.params.filename });
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check if CV service is available
    const cvUrl = process.env.CV_URL || 'http://localhost:8001';
    const response = await fetch(`${cvUrl}/health`);
    
    if (!response.ok) {
      return res.status(503).json({ error: 'CV service not available' });
    }

    // Start MP4 processing
    const { line, zone, conf, imgsz, frame_skip, model } = req.body || {};
    
    const body = {
      cameraId: file.filename,
      filePath: file.filePath,
      webhook: `${process.env.PUBLIC_BACKEND_URL || 'http://localhost:3000'}/api/mp4-events`,
      secret: process.env.CV_SHARED_SECRET || 'dev-secret',
      ...(line ? { line } : {}),
      ...(zone ? { zone } : {}),
      ...(conf ? { conf } : {}),
      ...(imgsz ? { imgsz } : {}),
      ...(frame_skip ? { frame_skip } : {}),
      ...(model ? { model } : {}),
    };

    const cvResponse = await fetch(`${cvUrl}/track/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!cvResponse.ok) {
      const errorData = await cvResponse.json();
      return res.status(cvResponse.status).json(errorData);
    }

    // Update file status
    await MP4File.findByIdAndUpdate(file._id, { 
      analyticsStatus: 'running',
      analyticsStartedAt: new Date()
    });

    res.json({ 
      message: 'MP4 analytics started',
      fileId: file._id,
      filename: file.filename
    });
  } catch (error) {
    console.error('Start MP4 analytics error:', error);
    res.status(500).json({ error: 'Failed to start analytics' });
  }
});

// Stop MP4 analytics
router.post('/analytics/:filename/stop', async (req, res) => {
  try {
    const file = await MP4File.findOne({ filename: req.params.filename });
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Stop MP4 processing
    const cvUrl = process.env.CV_URL || 'http://localhost:8001';
    const response = await fetch(`${cvUrl}/track/stop/${file.filename}`, {
      method: 'POST'
    });

    // Update file status
    await MP4File.findByIdAndUpdate(file._id, { 
      analyticsStatus: 'stopped',
      analyticsStoppedAt: new Date()
    });

    res.json({ message: 'MP4 analytics stopped' });
  } catch (error) {
    console.error('Stop MP4 analytics error:', error);
    res.status(500).json({ error: 'Failed to stop analytics' });
  }
});

// Get MP4 analytics status
router.get('/analytics/:filename/status', async (req, res) => {
  try {
    const file = await MP4File.findOne({ filename: req.params.filename });
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check CV service status
    const cvUrl = process.env.CV_URL || 'http://localhost:8001';
    const cameraId = file.filename;
    
    try {
      const cvResponse = await fetch(`${cvUrl}/track/status/${cameraId}`);
      if (cvResponse.ok) {
        const cvStatus = await cvResponse.json();
        res.json({
          filename: file.filename,
          status: cvStatus.running ? 'running' : 'stopped',
          startedAt: file.analyticsStartedAt,
          stoppedAt: file.analyticsStoppedAt
        });
      } else {
        res.json({
          filename: file.filename,
          status: 'stopped',
          startedAt: file.analyticsStartedAt,
          stoppedAt: file.analyticsStoppedAt
        });
      }
    } catch (cvError) {
      // If CV service is unreachable, return database status
      res.json({
        filename: file.filename,
        status: file.analyticsStatus || 'idle',
        startedAt: file.analyticsStartedAt,
        stoppedAt: file.analyticsStoppedAt
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to get status' });
  }
});

module.exports = router;
