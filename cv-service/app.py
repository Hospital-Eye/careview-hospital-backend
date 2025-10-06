# app.py  (at repo/cv-service/app.py)
from fastapi import FastAPI
from tracking.schemas import StartBody
from tracking.worker import SimpleHumanTracker

app = FastAPI()
workers: dict[str, SimpleHumanTracker] = {}

@app.get("/health")
def health():
    return {"ok": True, "workers": list(workers.keys())}

@app.post("/track/start")
def start(b: StartBody):
    if b.cameraId in workers:
        return {"ok": True, "message": "already running"}
    
    # Create worker with appropriate parameters
    w = SimpleHumanTracker(
        camera_id=b.cameraId,
        rtsp_url=b.rtsp if hasattr(b, 'rtsp') else None,
        hls_url=b.hlsUrl if hasattr(b, 'hlsUrl') else None,
        file_path=b.filePath if hasattr(b, 'filePath') else None,
        webhook=b.webhook,
        secret=b.secret,
        line=b.line if hasattr(b, 'line') else None,
        zone=b.zone if hasattr(b, 'zone') else None
    )
    
    workers[b.cameraId] = w
    w.start()
    return {"ok": True}

@app.post("/track/stop/{camera_id}")
def stop(camera_id: str):
    w = workers.get(camera_id)
    if not w:
        return {"ok": True, "message": "not running"}
    w.stop()
    workers.pop(camera_id, None)
    return {"ok": True}

@app.get("/track/status/{camera_id}")
def status(camera_id: str):
    return {"running": camera_id in workers}

# MP4-specific endpoints
@app.post("/track/mp4/start")
def start_mp4(b: StartBody):
    if b.cameraId in workers:
        return {"ok": True, "message": "already running"}
    if not b.filePath:
        return {"error": "filePath is required for MP4 analytics"}
    
    # Create worker for MP4
    w = SimpleHumanTracker(
        camera_id=b.cameraId,
        file_path=b.filePath,
        webhook=b.webhook,
        secret=b.secret,
        line=b.line if hasattr(b, 'line') else None,
        zone=b.zone if hasattr(b, 'zone') else None
    )
    
    workers[b.cameraId] = w
    w.start()
    return {"ok": True}

@app.post("/track/mp4/stop/{camera_id}")
def stop_mp4(camera_id: str):
    w = workers.get(camera_id)
    if not w:
        return {"ok": True, "message": "not running"}
    w.stop()
    workers.pop(camera_id, None)
    return {"ok": True}

@app.get("/track/mp4/status/{camera_id}")
def status_mp4(camera_id: str):
    return {"running": camera_id in workers}
