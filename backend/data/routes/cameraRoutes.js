const express = require('express');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const path = require('path');
const fs = require('fs');

const router = express.Router();
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// HLS folder
const streamFolder = path.join(__dirname, '../public/streams');
if (!fs.existsSync(streamFolder)) fs.mkdirSync(streamFolder, { recursive: true });

let ffmpegProcess = null;

/**
 * Internal function to start a stream (for auto-start or route).
 * @param {string} rtspUrl 
 */
function startStreamInternal(rtspUrl) {
  if (ffmpegProcess) {
    console.log("⚠ Stream already running.");
    return '/streams/stream.m3u8';
  }

  console.log(`▶ Starting FFmpeg stream from ${rtspUrl}`);
  const hlsPath = path.join(streamFolder, 'stream.m3u8');

  ffmpegProcess = ffmpeg(rtspUrl)
    .addOptions([
      '-c:v copy',
      '-c:a aac',
      '-f hls',
      '-hls_time 2',
      '-hls_list_size 6',
      '-hls_flags delete_segments'
    ])
    .output(hlsPath)
    .on('start', () => console.log('FFmpeg started for RTSP stream'))
    .on('error', (err) => console.error('FFmpeg error:', err))
    .on('end', () => console.log('FFmpeg ended'))
    .run();

  return '/streams/stream.m3u8';
}

// API: Start stream
router.post('/start', (req, res) => {
  const { rtspUrl } = req.body;
  if (!rtspUrl) return res.status(400).json({ error: 'RTSP URL is required' });

  const hlsUrl = startStreamInternal(rtspUrl);
  res.json({ message: 'Stream started', hlsUrl });
});

// API: Stop stream
router.post('/stop', (req, res) => {
  if (ffmpegProcess) {
    ffmpegProcess.kill('SIGINT');
    ffmpegProcess = null;
    return res.json({ message: 'Stream stopped' });
  }
  res.json({ message: 'No active stream' });
});

// API: Test page
router.get('/play', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Camera Stream Test</title>
      <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
    </head>
    <body>
      <h1>Reolink Stream Test</h1>
      <video id="video" width="640" height="360" controls autoplay></video>
      <script>
        if (Hls.isSupported()) {
          var video = document.getElementById('video');
          var hls = new Hls();
          hls.loadSource('/api/cameras/streams/stream.m3u8');
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, function() {
            video.play();
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = '/api/cameras/streams/stream.m3u8';
          video.addEventListener('loadedmetadata', function() {
            video.play();
          });
        }
      </script>
    </body>
    </html>
  `);
});

// Serve HLS files
router.use('/streams', express.static(streamFolder));

module.exports = { router, startStreamInternal };
