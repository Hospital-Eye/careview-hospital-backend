// const { EufySecurity, LogLevel } = require("eufy-security-client");
// const fs = require("fs");
// require("dotenv").config();

// let eufyClient = null;

// async function initEufy() {
//   if (!eufyClient) {
//     const persistPath = './persist';

//     if (!fs.existsSync(persistPath)) {
//       fs.mkdirSync(persistPath);
//     }

//     const config = {
//       username: process.env.EUFY_USER,
//       password: process.env.EUFY_PASS,
//       country: 'US',
//       language: 'en',
//       persistentDir: persistPath,
//     };

//     eufyClient = await EufySecurity.initialize(config, LogLevel.INFO);
//   }

//   return eufyClient;
// }

// async function listCameras() {
//   const client = await initEufy();
//   const devices = client.getDevices();

//   const cameraList = [];
//   for (const [, device] of devices) {
//     cameraList.push({
//       name: device.getName(),
//       serial: device.getSerial(),
//       model: device.getModel(),
//       type: device.getDeviceType(),
//     });
//   }
//   return cameraList;
// }

// async function startCameraStream(cameraName) {
//   const client = await initEufy();
//   const devices = client.getDevices();

//   for (const [serial, device] of devices) {
//     if (device.getName() === cameraName) {
//       const station = client.getStation(device.getStationSerial());
//       const streamUrl = await station.startLivestream(device);

//       return {
//         name: cameraName,
//         status: "started",
//         streamUrl: streamUrl ?? "Stream started, RTSP URL not available"
//       };
//     }
//   }

//   throw new Error("Camera not found");
// }

// async function stopCameraStream(cameraName) {
//   const client = await initEufy();
//   const devices = client.getDevices();

//   for (const [, device] of devices) {
//     if (device.getName() === cameraName) {
//       await device.stopLivestream();
//       return { name: cameraName, status: "stopped" };
//     }
//   }

//   throw new Error("Camera not found");
// }

// module.exports = {
//   startCameraStream,
//   stopCameraStream,
//   listCameras
// };

// utils/cameraWrapper.js
// Mock Camera Wrapper for testing RTSP streams without Eufy credentials

async function listCameras() {
  // Return a list of mock cameras
  return [
    {
      name: "DemoCamera",
      serial: "1234",
      model: "VirtualCam",
      type: "RTSP"
    }
  ];
}

async function startCameraStream(cameraName) {
  // Instead of talking to Eufy, just return our test RTSP URL
  return {
    name: cameraName || "Mock Camera",
    status: "started",
    streamUrl: "rtsp://localhost:8554/mystream"
  };
}

async function stopCameraStream(cameraName) {
  return { name: cameraName || "Mock Camera", status: "stopped" };
}

async function listCameras() {
  // Mock list of cameras
  return [
    { name: "Mock Camera 1", serial: "TEST123", model: "VirtualCam", type: "RTSP" }
  ];
}

module.exports = { startCameraStream, stopCameraStream, listCameras };


module.exports = {
  startCameraStream,
  stopCameraStream,
  listCameras
};
