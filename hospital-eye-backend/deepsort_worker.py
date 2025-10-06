#!/usr/bin/env python3

import cv2
import numpy as np
import time
import requests
import hashlib
import hmac
from ultralytics import YOLO
import os
import sys

# Add the deep_sort path
sys.path.append('Tracking-and-counting-Using-YOLOv8-and-DeepSORT/deep_sort')

try:
    from deep_sort.deep_sort import DeepSort
    from deep_sort.utils.parser import get_config
    DEEPSORT_AVAILABLE = True
except ImportError:
    print("DeepSORT not available, falling back to basic tracking")
    DEEPSORT_AVAILABLE = False

class DeepSORTWorker:
    def __init__(self, camera_id, rtsp_url=None, file_path=None, webhook=None, secret=None, line=None, zone=None):
        self.camera_id = camera_id
        self.rtsp_url = rtsp_url
        self.file_path = file_path
        self.webhook = webhook
        self.secret = secret
        self.line = line
        self.zone = zone
        
        # Initialize YOLO model
        self.model = YOLO('yolov8n.pt')  # Using YOLOv8n for speed
        
        # Initialize DeepSORT if available
        if DEEPSORT_AVAILABLE:
            try:
                config = get_config()
                config.merge_from_list(['REID_CKPT', 'deep_sort/deep/checkpoint/ckpt.t7'])
                config.merge_from_list(['MAX_DIST', '0.2'])
                config.merge_from_list(['MIN_CONFIDENCE', '0.3'])
                config.merge_from_list(['NMS_MAX_OVERLAP', '0.5'])
                config.merge_from_list(['MAX_IOU_DISTANCE', '0.7'])
                config.merge_from_list(['MAX_AGE', '70'])
                config.merge_from_list(['N_INIT', '3'])
                config.merge_from_list(['NN_BUDGET', '100'])
                
                self.tracker = DeepSort(config)
                print(f"[{self.camera_id}] DeepSORT initialized successfully")
            except Exception as e:
                print(f"[{self.camera_id}] Failed to initialize DeepSORT: {e}")
                self.tracker = None
        else:
            self.tracker = None
            print(f"[{self.camera_id}] Using basic tracking (DeepSORT not available)")
        
        # Tracking variables
        self.count_in = 0
        self.count_out = 0
        self.occupancy = 0
        self.last_side = {}
        self.last_post = time.time()
        
        # Video capture
        self.cap = None
        self.frame_count = 0
        self.total_people_detected = 0
        
    def start(self):
        """Start video processing"""
        try:
            if self.file_path and os.path.exists(self.file_path):
                input_source = self.file_path
                print(f"[{self.camera_id}] Starting MP4 processing: {self.file_path}")
            elif self.rtsp_url:
                input_source = self.rtsp_url
                print(f"[{self.camera_id}] Starting RTSP processing: {self.rtsp_url}")
            else:
                raise ValueError("No valid input source provided")
            
            self.cap = cv2.VideoCapture(input_source)
            if not self.cap.isOpened():
                raise ValueError(f"Failed to open video source: {input_source}")
            
            # Get video properties
            width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fps = self.cap.get(cv2.CAP_PROP_FPS)
            total_frames = int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT))
            
            print(f"[{self.camera_id}] Video properties: {width}x{height}, {fps:.2f} FPS, {total_frames} frames")
            
            # Process frames
            self.process_video()
            
        except Exception as e:
            print(f"[{self.camera_id}] Error starting processing: {e}")
            self.emit("error", {"message": str(e)})
    
    def process_video(self):
        """Process video frames"""
        try:
            while True:
                ret, frame = self.cap.read()
                if not ret:
                    print(f"[{self.camera_id}] End of video or failed to read frame")
                    break
                
                self.frame_count += 1
                
                # Process every 3rd frame for performance (adjust as needed)
                if self.frame_count % 3 != 0:
                    continue
                
                # Run YOLO detection
                results = self.model(frame, conf=0.3, verbose=False)
                
                if len(results) > 0:
                    result = results[0]
                    if result.boxes is not None and len(result.boxes) > 0:
                        boxes = result.boxes
                        
                        # Filter for people only (class 0)
                        people_detections = []
                        for i, box in enumerate(boxes):
                            cls = int(box.cls[0])
                            if cls == 0:  # person class
                                conf = float(box.conf[0])
                                xyxy = box.xyxy[0].cpu().numpy()
                                people_detections.append({
                                    'bbox': xyxy,
                                    'confidence': conf
                                })
                        
                        if people_detections:
                            print(f"[{self.camera_id}] Frame {self.frame_count}: Found {len(people_detections)} people")
                            self.total_people_detected = max(self.total_people_detected, len(people_detections))
                            
                            # Update tracking
                            if self.tracker:
                                self.update_tracking(frame, people_detections)
                            else:
                                # Basic counting without tracking
                                self.basic_counting(people_detections)
                
                # Send stats every 2 seconds
                if time.time() - self.last_post > 2:
                    self.last_post = time.time()
                    self.emit_stats()
                
                # Add small delay to prevent overwhelming
                time.sleep(0.01)
                
        except Exception as e:
            print(f"[{self.camera_id}] Error processing video: {e}")
            self.emit("error", {"message": str(e)})
        finally:
            if self.cap:
                self.cap.release()
            print(f"[{self.camera_id}] Video processing completed. Total people detected: {self.total_people_detected}")
    
    def update_tracking(self, frame, detections):
        """Update DeepSORT tracking"""
        try:
            # Convert detections to DeepSORT format
            bboxes = np.array([det['bbox'] for det in detections])
            scores = np.array([det['confidence'] for det in detections])
            
            # Update tracker
            tracks = self.tracker.update(bboxes, scores, frame)
            
            # Process tracking results
            current_people = len(tracks)
            self.occupancy = current_people
            
            print(f"[{self.camera_id}] Tracking: {current_people} people")
            
            # Emit tracking events
            for track in tracks:
                track_id = track.track_id
                bbox = track.to_tlbr()
                
                # Check line crossing if line is defined
                if self.line:
                    self.check_line_crossing(track_id, bbox)
                
                # Check zone occupancy if zone is defined
                if self.zone:
                    self.check_zone_occupancy(tracks)
                
        except Exception as e:
            print(f"[{self.camera_id}] Error in tracking: {e}")
    
    def basic_counting(self, detections):
        """Basic counting without tracking"""
        current_people = len(detections)
        self.occupancy = current_people
        print(f"[{self.camera_id}] Basic counting: {current_people} people")
    
    def check_line_crossing(self, track_id, bbox):
        """Check if person crossed the line"""
        # Implementation for line crossing detection
        pass
    
    def check_zone_occupancy(self, tracks):
        """Check zone occupancy"""
        # Implementation for zone occupancy detection
        pass
    
    def emit_stats(self):
        """Emit people statistics"""
        stats = {
            "count_in": self.count_in,
            "count_out": self.count_out,
            "occupancy": self.occupancy,
            "total_detected": self.total_people_detected
        }
        print(f"[{self.camera_id}] Emitting stats: {stats}")
        self.emit("people-stats", stats)
    
    def emit(self, evt_type, data):
        """Emit event to webhook"""
        if not self.webhook:
            return
            
        payload = {
            "cameraId": self.camera_id,
            "ts": int(time.time() * 1000),
            "type": evt_type,
            "data": data,
            "secret": self.secret
        }
        
        # Sign payload
        sig = self.sign(payload)
        payload["sig"] = sig
        
        try:
            response = requests.post(self.webhook, json=payload, timeout=1.5)
            if response.status_code != 200:
                print(f"[{self.camera_id}] Webhook error: {response.status_code}")
        except Exception as e:
            print(f"[{self.camera_id}] Error sending webhook: {e}")
    
    def sign(self, payload):
        """Sign payload with secret"""
        if not self.secret:
            return ""
        
        # Remove sig field for signing
        payload_copy = payload.copy()
        if 'sig' in payload_copy:
            del payload_copy['sig']
        
        # Create signature
        message = str(payload_copy)
        signature = hmac.new(
            self.secret.encode('utf-8'),
            message.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        return signature
    
    def stop(self):
        """Stop processing"""
        if self.cap:
            self.cap.release()
        print(f"[{self.camera_id}] Processing stopped")

# Test function
if __name__ == "__main__":
    # Test with your fragment video
    worker = DeepSORTWorker(
        camera_id="test-fragment",
        file_path="public/uploads/fragment_01_2_20250826120952.mp4",
        webhook="http://localhost:3000/api/mp4-events",
        secret="your-secret-here"
    )
    
    try:
        worker.start()
    except KeyboardInterrupt:
        print("Stopping...")
        worker.stop()
