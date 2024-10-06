import React, { useState, useRef } from 'react';
import axios from 'axios';
import * as posenet from '@tensorflow-models/posenet';
import '@tensorflow/tfjs';
import { getAdjacentKeyPoints } from '@tensorflow-models/posenet';

function App() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fallDetected, setFallDetected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false); // New state to track streaming status
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null); // Ref to store the video stream
  const userPhoneNumber = useRef('');

  // Handle phone number input
  const handlePhoneNumberSubmit = (e) => {
    e.preventDefault();
    userPhoneNumber.current = phoneNumber;
    console.log(`Phone number saved: ${userPhoneNumber.current}`);
  };

  // Access webcam and load PoseNet model
  const startStreamAndDetection = async () => {
    try {
      const net = await posenet.load({
        architecture: 'MobileNetV1',
        outputStride: 16,
        inputResolution: { width: 640, height: 480 },
        multiplier: 0.75
      });
      
      setIsLoading(true);

      // Access webcam
      navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          streamRef.current = stream; // Save the stream to stop later

          setIsStreaming(true); // Set streaming to true

          // Start fall detection process
          detectFall(net);
        })
        .catch((err) => {
          console.error("Error accessing webcam:", err);
        });
    } catch (error) {
      console.error('Error loading PoseNet:', error);
    }
  };

  // Stop webcam stream
  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop()); // Stop all video tracks
      streamRef.current = null;
    }

    // Clear video and canvas
    videoRef.current.pause();
    videoRef.current.srcObject = null;

    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    setIsStreaming(false); // Set streaming to false
    setIsLoading(false); // Reset loading state
  };

  const detectFall = async (net) => {
    const detect = async () => {
      try {
        if (!isStreaming) return;  // Stop detection if the stream has stopped
  
        const pose = await net.estimateSinglePose(videoRef.current, {
          flipHorizontal: false,
        });
  
        // Check if fall is detected
        const fall = isFallDetected(pose);
  
        // Draw the pose and skeleton on canvas
        drawCanvas(pose, videoRef.current, canvasRef.current, fall);
  
        if (fall) {
          console.log('============== Fall detected! ===============');
          setFallDetected(true);
          // Optionally trigger emergency call
          // triggerEmergencyCall(userPhoneNumber.current);
        } else {
          setFallDetected(false);
        }
  
        requestAnimationFrame(detect);
      } catch (error) {
        console.error('Error in pose detection:', error);
      }
    };
  
    detect();
  };
  
  const isFallDetected = (pose) => {
    const keypoints = pose.keypoints;
    console.log('=======Detected Keypoints:', pose.keypoints);
    const leftShoulder = keypoints.find(k => k.part === 'leftShoulder');
    const rightShoulder = keypoints.find(k => k.part === 'rightShoulder');
    const leftHip = keypoints.find(k => k.part === 'leftHip');
    const rightHip = keypoints.find(k => k.part === 'rightHip');
  
    if (leftShoulder && rightShoulder && leftHip && rightHip) {
      const shouldersY = (leftShoulder.position.y + rightShoulder.position.y) / 2;
      const hipsY = (leftHip.position.y + rightHip.position.y) / 2;
      const shouldersX = (leftShoulder.position.x + rightShoulder.position.x) / 2;
      const hipsX = (leftHip.position.x + rightHip.position.x) / 2;
  
      const deltaY = hipsY - shouldersY;
      const deltaX = hipsX - shouldersX;
  
      const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
  
      // Check if the torso is nearly horizontal
      if (Math.abs(angle) < 45) {
        return true;
      }
    }
  
    return false;
  };  

  const drawKeypoints = (keypoints, minConfidence, ctx, color = 'aqua') => {
    keypoints.forEach((keypoint) => {
      if (keypoint.score >= minConfidence) {
        const { x, y } = keypoint.position;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
      }
    });
  };
  
  const drawSkeleton = (keypoints, minConfidence, ctx, color = 'red', lineWidth = 2) => {
    const adjacentKeyPoints = getAdjacentKeyPoints(keypoints, minConfidence);
  
    adjacentKeyPoints.forEach((keypointPair) => {
      drawSegment(
        keypointPair[0].position,
        keypointPair[1].position,
        color,
        lineWidth,
        ctx
      );
    });
  };
  
  const drawSegment = (from, to, color, lineWidth, ctx) => {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  };
  
  const drawCanvas = (pose, video, canvas, fall) => {
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  
    const minConfidence = 0.2;  // Adjusted to be more lenient
  
    const ctx_new = canvasRef.current.getContext('2d');
    if (ctx_new) {
        console.log("ctx found");
    } else {
    console.error('Canvas context not available');
    }


    // Draw with different colors based on whether a fall is detected
    if (fall) {
      drawKeypoints(pose.keypoints, minConfidence, ctx, 'red');
      drawSkeleton(pose.keypoints, minConfidence, ctx, 'red');
    } else {
      drawKeypoints(pose.keypoints, minConfidence, ctx, 'aqua');
      drawSkeleton(pose.keypoints, minConfidence, ctx, 'red');
    }
  };
  

  const triggerEmergencyCall = (phoneNumber) => {
    axios.post('/api/call-caregiver', { toPhoneNumber: phoneNumber })
      .then(response => {
        console.log('Call initiated:', response.data);
      })
      .catch(error => {
        console.error('Error initiating call:', error);
      });
  };

  return (
    <div className="App">
      <h2>Fall Detection System</h2>
      <form onSubmit={handlePhoneNumberSubmit} style={{ zIndex: 3, position: 'relative' }}>
        <input
          type="tel"
          placeholder="Enter phone number"
          value={phoneNumber}
          onChange={(e) => {
            setPhoneNumber(e.target.value);
            console.log("Phone Number:", e.target.value);
          }}
          required
          style={{ zIndex: 3, position: 'relative' }}
        />
        <button type="submit" style={{ zIndex: 3, position: 'relative' }}>
          Save Phone Number
        </button>
      </form>

      {/* Start Livestream Button */}
      <button
        onClick={startStreamAndDetection}
        style={{ zIndex: 3, position: 'relative', marginRight: '10px' }}
        disabled={isStreaming} // Disable when stream is running
      >
        {isLoading ? 'Starting...' : 'Start Livestream'}
      </button>

      {/* Stop Livestream Button */}
      <button
        onClick={stopStream}
        style={{ zIndex: 3, position: 'relative' }}
        disabled={!isStreaming} // Disable if stream is not running
      >
        Stop Livestream
      </button>

      <div
        style={{ position: 'relative', width: '640px', height: '480px', marginTop: '20px' }}
      >
        <video
          ref={videoRef}
          style={{ position: 'absolute', width: '100%', height: '100%', zIndex: 1 }}
          playsInline
        />
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', width: '100%', height: '100%', zIndex: 2 }}
        />
      </div>

      {fallDetected && (
        <h3 style={{ color: 'red', zIndex: 3, position: 'relative' }}>
          Fall Detected! Calling caregiver...
        </h3>
      )}
    </div>
  );
}

export default App;
