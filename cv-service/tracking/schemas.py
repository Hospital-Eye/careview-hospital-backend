from pydantic import BaseModel, Field
from typing import Tuple, Dict, Any, List

Point = Tuple[int, int]

class StartBody(BaseModel):
    cameraId: str
    rtsp: str | None = None              # RTSP URL for live cameras
    hlsUrl: str | None = None            # HLS playlist URL for live cameras
    filePath: str | None = None          # Local file path for MP4 files
    webhook: str                         # Node endpoint
    secret: str                          # shared HMAC secret
    line: Tuple[Point, Point] | None = None
    zone: List[Point] | None = None      # optional polygon for occupancy
    conf: float = 0.35
    imgsz: int = 640
    frame_skip: int = 1                  # 2–3 for CPU savings
    model: str = "yolov8n.pt"            # swapable

class CVEvent(BaseModel):
    cameraId: str
    ts: int
    type: str                            # "people-stats" | "enter" | "exit"
    data: Dict[str, Any]
    sig: str                              # HMAC signature
