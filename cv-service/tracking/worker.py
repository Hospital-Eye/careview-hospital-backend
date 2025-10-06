#!/usr/bin/env python3

import cv2
import numpy as np
import time
import requests
import hmac
import hashlib
import threading
from ultralytics import YOLO

class SimpleHumanTracker:
    """Simple, working human detection and counting - no complex tracking"""
    
    def __init__(self, camera_id, rtsp_url=None, hls_url=None, file_path=None, webhook=None, secret=None, line=None, zone=None):
        self.camera_id = camera_id
        self.rtsp_url = rtsp_url
        self.file_path = file_path
        self.hls_url = hls_url
        self.webhook = webhook
        self.secret = secret
        
        # Video capture
        self.cap = None
        self.running = False
        self.frame_count = 0
        
        # Simple YOLO detection
        self.model = YOLO('yolov8n.pt')
        
        # Simple counting - just track current people visible
        self.current_people_count = 0
        self.total_frames_processed = 0
        
        # Statistics
        self.last_stats_time = time.time()
        self.stats_interval = 1.0
        
        # Video output
        self.output_writer = None
        self.output_path = None
        
        print(f"[{self.camera_id}] SimpleHumanTracker initialized - basic but working")
    
    def start(self):
        """Start processing video"""
        try:
            # Initialize video capture
            if self.file_path:
                self.cap = cv2.VideoCapture(self.file_path)
                print(f"[{self.camera_id}] Processing MP4 file: {self.file_path}")
            elif self.hls_url:
                # Prefer HLS if provided (more robust than RTSP)
                self.cap = cv2.VideoCapture(self.hls_url)
                print(f"[{self.camera_id}] Processing HLS stream: {self.hls_url}")
            elif self.rtsp_url:
                self.cap = cv2.VideoCapture(self.rtsp_url, cv2.CAP_FFMPEG)
                print(f"[{self.camera_id}] Processing RTSP stream: {self.rtsp_url}")
            else:
                raise ValueError("No video source specified")
            
            if not self.cap.isOpened():
                raise RuntimeError("Failed to open video source")
            
            # Get video properties
            fps = self.cap.get(cv2.CAP_PROP_FPS)
            total_frames = int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT))
            width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            
            print(f"[{self.camera_id}] Video: {width}x{height}, {fps:.2f} FPS, {total_frames} frames")
            
            # Initialize video writer
            self.init_video_writer(width, height, fps)
            
            self.running = True
            
            # Start processing in a separate thread
            self.processing_thread = threading.Thread(target=self.process_video)
            self.processing_thread.daemon = True
            self.processing_thread.start()
            
            print(f"[{self.camera_id}] Started simple processing")
            
        except Exception as e:
            print(f"[{self.camera_id}] Error starting: {e}")
            import traceback
            traceback.print_exc()
    
    def init_video_writer(self, width, height, fps):
        """Initialize video writer for output with bounding boxes"""
        try:
            # Create output filename
            base_name = self.file_path.split('/')[-1].replace('.mp4', '') if self.file_path else self.camera_id
            self.output_path = f"simple_{base_name}_with_boxes.mp4"
            
            # Initialize video writer
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            self.output_writer = cv2.VideoWriter(
                self.output_path, fourcc, fps, (width, height)
            )
            
            print(f"[{self.camera_id}] Video writer initialized: {self.output_path}")
            
        except Exception as e:
            print(f"[{self.camera_id}] Error initializing video writer: {e}")
            self.output_writer = None
    
    def process_video(self):
        """Main video processing loop - simple and working"""
        try:
            print(f"[{self.camera_id}] Starting simple video processing...")
            
            while self.running and self.cap.isOpened():
                ret, frame = self.cap.read()
                if not ret:
                    print(f"[{self.camera_id}] End of video or failed to read frame")
                    break
                
                self.frame_count += 1
                
                # Process frame with simple detection
                self.process_frame_simple(frame)
                
                # Send stats periodically
                current_time = time.time()
                if current_time - self.last_stats_time >= self.stats_interval:
                    self.send_stats()
                    self.last_stats_time = current_time
                    
        except Exception as e:
            print(f"[{self.camera_id}] Error processing video: {e}")
            import traceback
            traceback.print_exc()
        finally:
            if self.cap:
                self.cap.release()
            if self.output_writer:
                self.output_writer.release()
            print(f"[{self.camera_id}] Simple video processing completed")
    
    def process_frame_simple(self, frame):
        """Simple frame processing - just detect people and draw boxes"""
        try:
            # Skip first few frames to avoid startup noise
            if self.frame_count < 5:
                return
            
            # Run YOLO detection with high confidence
            results = self.model.predict(
                source=frame,
                conf=0.7,  # High confidence to avoid false positives
                verbose=False,
                classes=[0],  # Only person class
                imgsz=640
            )
            
            # Count people in this frame
            people_in_frame = 0
            
            # Process detections and draw bounding boxes
            for result in results:
                if result.boxes is not None:
                    for box in result.boxes:
                        # Only process people (class 0)
                        if int(box.cls) == 0:
                            # Get bounding box coordinates
                            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                            confidence = float(box.conf)
                            
                            # Convert to integers for drawing
                            x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
                            
                            # Draw bounding box
                            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 3)
                            
                            # Draw confidence score
                            cv2.putText(frame, f"Person {confidence:.2f}", 
                                       (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
                            
                            # Count this person
                            people_in_frame += 1
            
            # Update current count
            self.current_people_count = people_in_frame
            self.total_frames_processed += 1
            
            # Draw statistics on frame
            cv2.putText(frame, f"People: {self.current_people_count}", 
                       (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 3)
            cv2.putText(frame, f"Frame: {self.frame_count}", 
                       (10, 70), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 3)
            
            # Save frame with bounding boxes
            if self.output_writer:
                self.output_writer.write(frame)
                
            # Log every 30 frames
            if self.frame_count % 30 == 0:
                print(f"[{self.camera_id}] Frame {self.frame_count}: {people_in_frame} people detected")
                
        except Exception as e:
            print(f"[{self.camera_id}] Error processing frame: {e}")
            import traceback
            traceback.print_exc()
    
    def send_stats(self):
        """Send simple statistics"""
        stats = {
            "count_in": self.current_people_count,  # Current people visible
            "count_out": 0,  # Not tracking exits
            "occupancy": self.current_people_count,  # Current occupancy
            "total_detected": self.current_people_count,  # Current detection
            "frame_count": self.frame_count,
            "total_frames_processed": self.total_frames_processed
        }
        
        print(f"[{self.camera_id}] Simple Stats: {stats}")
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
        self.running = False
        if self.cap:
            self.cap.release()
        if self.output_writer:
            self.output_writer.release()
        print(f"[{self.camera_id}] Simple processing stopped")
        
        # Show final output path
        if self.output_path:
            print(f"[{self.camera_id}] Simple processed video saved to: {self.output_path}")

# Test function
if __name__ == "__main__":
    # Test with the fragment video
    worker = SimpleHumanTracker(
        camera_id="test-fragment",
        file_path="../hospital-eye-backend/public/uploads/fragment_01_2_20250826120952.mp4",
        webhook="http://localhost:3000/api/mp4-events",
        secret="dev-secret"
    )
    
    worker.start()
