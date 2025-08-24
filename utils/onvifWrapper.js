const OnvifManager = require('node-onvif');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');

const streamFolder = path.join(__dirname, '../public/streams');
if (!fs.existsSync(streamFolder)) fs.mkdirSync(streamFolder, { recursive: true });

async function discoverCameras() {
  console.log('🔍 Discovering ONVIF cameras...');
  const devices = await OnvifManager.startProbe();
  return devices.map(d => ({
    name: d.name || 'ONVIF Camera',
    xaddr: d.xaddrs[0],
    address: d.address
  }));
}

async function getSnapshot(xaddr, username, password) {
  const device = new OnvifManager.OnvifDevice({
    xaddr,
    user: username,
    pass: password
  });

  await device.init();
  const snapshot = await device.fetchSnapshot();
  return snapshot;
}

function startStream(rtspUrl, outputFile = 'stream.m3u8') {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(streamFolder, outputFile);

    // Clear old files
    fs.readdirSync(streamFolder).forEach(f => fs.unlinkSync(path.join(streamFolder, f)));

    ffmpeg(rtspUrl)
      .addOptions([
        '-c:v copy',
        '-c:a aac',
        '-f hls',
        '-hls_time 1',
        '-hls_list_size 5',
        '-hls_flags delete_segments'
      ])
      .output(outputPath)
      .on('start', () => {
        console.log(`▶ Streaming started from: ${rtspUrl}`);
        resolve(`/streams/${outputFile}`);
      })
      .on('error', (err) => {
        console.error('FFmpeg error:', err);
        reject(err);
      })
      .run();
  });
}

module.exports = {
  discoverCameras,
  getSnapshot,
  startStream
};
