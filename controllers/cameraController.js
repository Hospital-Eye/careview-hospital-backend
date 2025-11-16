// // controllers/cameraController.js
// const { spawn } = require('child_process');
// const path = require('path');
// const fs = require('fs');
// const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');

// const STREAM_ROOT = path.join(__dirname, '..', 'public', 'streams');
// if (!fs.existsSync(STREAM_ROOT)) fs.mkdirSync(STREAM_ROOT, { recursive: true });

// // keep active ffmpeg processes by stream id
// const procs = new Map();

// function ensureCleanDir(dir) {
//   if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
//   for (const f of fs.readdirSync(dir)) {
//     try { fs.unlinkSync(path.join(dir, f)); } catch {}
//   }
// }

// exports.startStream = async (req, res) => {
//   try {
//     const {
//       ip, user, pass,
//       id = 'cam1',
//       channel = 0,
//       stream = 'main',          // 'main' | 'sub'
//       rtspPort = 554,           // Reolink: often 554; yours worked at 555
//       useSystemFfmpeg = false,  // set true to use your system ffmpeg on PATH
//       forceEncode = false       // set true if camera outputs H.265/HEVC
//     } = req.body || {};

//     if (!ip || !user || !pass) {
//       return res.status(400).json({ error: 'ip, user, pass are required' });
//     }

//     if (procs.has(id)) {
//       return res.json({ ok: true, message: 'already running', hls: `/streams/${id}/index.m3u8` });
//     }

//     const outDir = path.join(STREAM_ROOT, id);
//     ensureCleanDir(outDir);

//     // Build Reolink RTSP path: h264Preview_01_main / _sub
//     const suffix = `h264Preview_${String(Number(channel) + 1).padStart(2, '0')}_${stream === 'sub' ? 'sub' : 'main'}`;
//     const rtsp_url = `rtsp://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${ip}:${rtspPort}/${suffix}`;

//     // Choose ffmpeg binary
//     // const ffmpegPath = useSystemFfmpeg ? 'ffmpeg' : (ffmpegInstaller.path || 'ffmpeg');
//     const ffmpegPath = 'ffmpeg'; // make sure `which ffmpeg` shows a path


//     // Minimal, robust args. Start with "copy". If no segments or browser can't play,
//     // set forceEncode=true in the POST body to re-encode to H.264.
//     // const baseArgs = [
//     //   '-loglevel', 'warning',
//     //   '-rtsp_transport', 'tcp',       // reliable; change to 'udp' if your network blocks TCP
//     //   '-i', rtsp_url,
//     //   '-an',
//     //   '-g', '25',
//     //   '-hls_time', '2',
//     //   '-hls_list_size', '10',
//     //   '-hls_flags', 'delete_segments+program_date_time',
//     //   '-hls_segment_filename', path.join(outDir, 'seg_%03d.ts'),
//     //   path.join(outDir, 'index.m3u8'),
//     // ];

//     // const args = forceEncode
//     //   ? [
//     //       ...baseArgs.slice(0, 6),
//     //       // insert encoder after '-an'
//     //       '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'zerolatency',
//     //       ...baseArgs.slice(6),
//     //     ]
//     //   : [
//     //       ...baseArgs.slice(0, 6),
//     //       // insert copy after '-an'
//     //       '-c:v', 'copy',
//     //       ...baseArgs.slice(6),
//     //     ];

//     // const args = [
//     //     '-loglevel','warning',
//     //     '-rtsp_transport','tcp',
//     //     '-fflags','+genpts','-use_wallclock_as_timestamps','1',
//     //     '-i', rtsp_url,
//     //     '-an',
//     //     '-c:v','copy',
//     //     '-g','60',
//     //     '-hls_time','4',
//     //     '-hls_list_size','8',
//     //     '-hls_flags','delete_segments+program_date_time+independent_segments',
//     //     '-hls_segment_filename', path.join(outDir,'seg_%03d.ts'),
//     //     path.join(outDir,'index.m3u8'),
//     //   ];

//     const args = [
//         '-loglevel','warning',
//         '-rtsp_transport','tcp','-rtsp_flags','prefer_tcp',
//         '-fflags','+genpts','-use_wallclock_as_timestamps','1',
//         '-rtbufsize','100M',
//         '-i', rtsp_url,
//         '-an',
//         '-c:v','copy',                        // no transcode → smoothest
//         '-hls_time','4',                      // slightly bigger segments = steadier playback
//         '-hls_list_size','8',
//         '-hls_flags','delete_segments+program_date_time+independent_segments',
//         '-hls_segment_filename', path.join(outDir,'seg_%03d.ts'),
//         path.join(outDir,'index.m3u8'),
//       ];



//     // Logs (super helpful for debugging)
//     console.log('🛠 FFmpeg path:', ffmpegPath);
//     console.log('🎯 RTSP URL:', rtsp_url);
//     console.log('📁 HLS outDir:', outDir);
//     console.log('▶️  FFmpeg args:', args.join(' '));

//     const ff = spawn(ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
//     procs.set(id, ff);

//     ff.on('error', (e) => console.error(`❌ FFmpeg spawn error (${id}):`, e));
//     ff.stdout.on('data', (d) => console.log(`[FF:${id}]`, d.toString()));
//     ff.stderr.on('data', (d) => console.log(`[FFERR:${id}]`, d.toString()));
//     ff.on('close', (code) => {
//       console.log(`⏹️  FFmpeg (${id}) exited with code ${code}`);
//       procs.delete(id);
//     });

//     // Return immediately; files will appear shortly if FFmpeg runs
//     return res.json({ ok: true, hls: `/streams/${id}/index.m3u8` });
//   } catch (e) {
//     console.error(e);
//     return res.status(500).json({ error: 'internal error', detail: String(e?.message || e) });
//   }
// };

// exports.stopStream = (req, res) => {
//   const { id } = req.params;
//   const p = procs.get(id);
//   if (!p) return res.json({ ok: true, message: 'not running' });

//   try { p.kill('SIGTERM'); } catch {}
//   procs.delete(id);
//   return res.json({ ok: true, message: 'stopped' });
// };

// exports.statusStream = (req, res) => {
//   const { id } = req.params;
//   return res.json({ running: procs.has(id) });
// };


const { Camera } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const STREAM_ROOT = path.join(__dirname, '..', 'public', 'streams');
if (!fs.existsSync(STREAM_ROOT)) fs.mkdirSync(STREAM_ROOT, { recursive: true });

const procs = new Map(); // id (camId or custom id) -> child process

function ensureCleanDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) {
    try { fs.unlinkSync(path.join(dir, f)); } catch {}
  }
}

function rtspFor({ ip, rtspPort, username, password, channel = 0, stream = 'sub' }) {
  const suffix = `h264Preview_${String(Number(channel) + 1).padStart(2, '0')}_${stream === 'sub' ? 'sub' : 'main'}`;
  return `rtsp://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${ip}:${rtspPort}/${suffix}`;
}

function ffmpegArgs({ rtspUrl, outDir, transport = 'tcp', forceEncode = false }) {
  const transportArgs =
    transport === 'udp'  ? ['-rtsp_transport', 'udp'] :
    transport === 'http' ? ['-rtsp_transport', 'http'] :
                           ['-rtsp_transport', 'tcp', '-rtsp_flags', 'prefer_tcp'];

  const videoArgs = forceEncode
    ? ['-r','15','-vf','scale=-2:540','-c:v','h264_videotoolbox','-b:v','2000k','-maxrate','2200k','-bufsize','4400k']
    // best case: substream H.264 -> copy (no transcode)
    : ['-c:v', 'copy'];

  return [
    '-loglevel','warning',
    ...transportArgs,
    '-fflags','+genpts','-use_wallclock_as_timestamps','1',
    '-rtbufsize','100M',
    '-i', rtspUrl,
    '-an',
    ...videoArgs,
    // HLS (slightly larger segments for steady playback)
    '-hls_time','4',
    '-hls_list_size','8',
    '-hls_flags','delete_segments+program_date_time+independent_segments',
    '-hls_segment_filename', path.join(outDir, 'seg_%03d.ts'),
    path.join(outDir, 'index.m3u8'),
  ];
}

function spawnFfmpeg({ id, rtspUrl, outDir, transport, forceEncode }) {
  const ffmpegPath = require('ffmpeg-static');
  const args = ffmpegArgs({ rtspUrl, outDir, transport, forceEncode });

  console.log('🛠 FFmpeg path:', ffmpegPath);
  console.log('🎯 RTSP URL:', rtspUrl);
  console.log('📁 HLS outDir:', outDir);
  console.log('▶️  FFmpeg args:', args.join(' '));

  const ff = spawn(ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  procs.set(id, ff);
  ff.on('error', (e) => console.error(`FFmpeg spawn error (${id}):`, e));
  ff.stdout.on('data', (d) => console.log(`[FF:${id}]`, d.toString()));
  ff.stderr.on('data', (d) => console.log(`[FFERR:${id}]`, d.toString()));
  ff.on('close', (code) => {
    console.log(`⏹️  FFmpeg (${id}) exited with code ${code}`);
    procs.delete(id);
  });
}

exports.startStream = async (req, res) => {
  try {
    const {
      ip, user, pass,
      id = 'cam1',
      channel = 0,
      stream = 'sub',           
      rtspPort = 554,
      transport = 'tcp',
      forceEncode = false
    } = req.body || {};

    if (!ip || !user || !pass) {
      return res.status(400).json({ error: 'ip, user, pass are required' });
    }
    if (procs.has(id)) {
      return res.json({ ok: true, message: 'already running', hls: `/streams/${id}/index.m3u8` });
    }

    const outDir = path.join(STREAM_ROOT, id);
    ensureCleanDir(outDir);
    const rtspUrl = rtspFor({ ip, rtspPort, username: user, password: pass, channel, stream });

    spawnFfmpeg({ id, rtspUrl, outDir, transport, forceEncode });
    return res.json({ ok: true, hls: `/streams/${id}/index.m3u8` });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'internal error', detail: String(e?.message || e) });
  }
};

exports.stopStream = (req, res) => {
  const { id } = req.params;
  const p = procs.get(id);
  if (!p) return res.json({ ok: true, message: 'not running' });
  try { p.kill('SIGTERM'); } catch {}
  procs.delete(id);
  return res.json({ ok: true, message: 'stopped' });
};

exports.statusStream = (_req, res) => res.json({ error: 'use /api/cameras/:id/status (DB mode)' });


exports.createCamera = async (req, res) => {
  try { res.status(201).json(await Camera.create(req.body)); }
  catch (e) { res.status(400).json({ error: e.message }); }
};

exports.listCameras = async (_req, res) => {
  const cams = await Camera.findAll({ order: [['createdAt', 'DESC']] });
  res.json(cams);
};

exports.getCamera = async (req, res) => {
  const cam = await Camera.findByPk(req.params.id);
  if (!cam) return res.status(404).json({ error: 'not found' });
  res.json(cam);
};

exports.updateCamera = async (req, res) => {
  const cam = await Camera.findByPk(req.params.id);
  if (!cam) return res.status(404).json({ error: 'not found' });

  await cam.update(req.body);
  res.json(cam);
};

exports.deleteCamera = async (req, res) => {
  const { id } = req.params;
  const p = procs.get(id); if (p) { try { p.kill('SIGTERM'); } catch {} procs.delete(id); }
  await Camera.destroy({ where: { id } });
  res.json({ ok: true });
};

exports.startById = async (req, res) => {
  try {
    console.log('Camera start request params:', req.params);
    const { id } = req.params;
    const cam = await Camera.findByPk(id);
    if (!cam) return res.status(404).json({ error: 'camera not found' });
    if (procs.has(id)) return res.json({ ok: true, message: 'already running', hls: `/streams/${id}/index.m3u8` });

    const channel    = req.body?.channel    ?? cam.defaultChannel ?? 0;
    const stream     = req.body?.stream     ?? cam.defaultStream  ?? 'sub';
    const transport  = req.body?.transport  ?? cam.transport      ?? 'tcp';
    const forceEncode= req.body?.forceEncode?? cam.forceEncode    ?? false;

    const rtspUrl = rtspFor({
      ip: cam.ip,
      rtspPort: cam.rtspPort || 554,
      username: cam.auth.username,
      password: cam.auth.password,
      channel, stream
    });

    const outDir = path.join(STREAM_ROOT, id);
    ensureCleanDir(outDir);
    spawnFfmpeg({ id, rtspUrl, outDir, transport, forceEncode });

    res.json({ ok: true, hls: `/streams/${id}/index.m3u8` });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'internal error', detail: e.message });
  }
};

exports.stopById = (req, res) => {
  const { id } = req.params;
  const p = procs.get(id);
  if (!p) return res.json({ ok: true, message: 'not running' });
  try { p.kill('SIGTERM'); } catch {}
  procs.delete(id);
  res.json({ ok: true, message: 'stopped' });
};

exports.statusById = (req, res) => {
  const { id } = req.params;
  res.json({ running: procs.has(id) });
};
