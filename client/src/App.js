import React, { useState, useRef } from 'react';
import axios from 'axios';
import Human from '@vladmandic/human';

function App() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fallDetected, setFallDetected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const userPhoneNumber = useRef('');

  // Initialize Human model
  const humanConfig = {
    backend: 'webgl',
    modelBasePath: 'https://vladmandic.github.io/human/models',
    cacheSensitivity: 0,
    async: true,
    warmup: 'none',
    face: { enabled: false },
    hand: { enabled: false },
    body: { enabled: true },
  };

  const human = new Human(humanConfig);

  // Handle phone number input
  const handlePhoneNumberSubmit = (e) => {
    e.preventDefault();
    userPhoneNumber.current = phoneNumber;
    console.log(`Phone number saved: ${userPhoneNumber.current}`);
  };

  // Access webcam and load Human model
  const startStreamAndDetection = async () => {
    try {
      await human.load(); // Load models and initialize
      await human.warmup(); // Optional: warm up the model

      setIsLoading(true);

      // Access webcam
      navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          streamRef.current = stream; // Save the stream to stop later

          setIsStreaming(true); // Set streaming to true

          // Start fall detection process
          detectFall();
        })
        .catch((err) => {
          console.error("Error accessing webcam:", err);
        });
    } catch (error) {
      console.error('Error initializing Human:', error);
    }
  };

  // Stop webcam stream
  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    videoRef.current.pause();
    videoRef.current.srcObject = null;

    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    setIsStreaming(false);
    setIsLoading(false);
  };

  const detectFall = async () => {
    const detect = async () => {
      try {
        if (!isStreaming) return;

        const result = await human.detect(videoRef.current);
        const poses = result.body;

        if (poses && poses.length > 0) {
          const pose = poses[0];

          // Check if fall is detected
          const fall = isFallDetected(pose);

          // Draw the pose and skeleton on canvas
          drawCanvas(pose, videoRef.current, canvasRef.current, fall);

          if (fall) {
            console.log('============== Fall detected! ===============');
            setFallDetected(true);
            // triggerEmergencyCall(userPhoneNumber.current);
          } else {
            setFallDetected(false);
          }
        } else {
          // Clear canvas if no pose is detected
          const ctx = canvasRef.current.getContext('2d');
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
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
    console.log('=======Detected Keypoints:', keypoints);
    const leftShoulder = keypoints.find(k => k.part === 'left_shoulder');
    const rightShoulder = keypoints.find(k => k.part === 'right_shoulder');
    const leftHip = keypoints.find(k => k.part === 'left_hip');
    const rightHip = keypoints.find(k => k.part === 'right_hip');

    if (leftShoulder && rightShoulder && leftHip && rightHip) {
      const shouldersY = (leftShoulder.position[1] + rightShoulder.position[1]) / 2;
      const hipsY = (leftHip.position[1] + rightHip.position[1]) / 2;
      const shouldersX = (leftShoulder.position[0] + rightShoulder.position[0]) / 2;
      const hipsX = (leftHip.position[0] + rightHip.position[0]) / 2;

      const deltaY = hipsY - shouldersY;
      const deltaX = hipsX - shouldersX;

      const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

      // Adjust angle threshold as needed
      if (Math.abs(angle) < 90) {
        return true;
      }
    }

    return false;
  };

  const drawKeypoints = (keypoints, minConfidence, ctx, color = 'aqua') => {
    keypoints.forEach((keypoint) => {
      if (keypoint.score >= minConfidence) {
        const [x, y] = keypoint.position;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
      }
    });
  };

  const drawSkeleton = (keypoints, minConfidence, ctx, color = 'red', lineWidth = 2) => {
    const adjacentKeyPoints = human.draw.connect(keypoints);

    adjacentKeyPoints.forEach(([from, to]) => {
      drawSegment(from.position, to.position, color, lineWidth, ctx);
    });
  };

  const drawSegment = (from, to, color, lineWidth, ctx) => {
    ctx.beginPath();
    ctx.moveTo(from[0], from[1]);
    ctx.lineTo(to[0], to[1]);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  };

  const drawCanvas = (pose, video, canvas, fall) => {
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const minConfidence = 0.2;

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

      <button
        onClick={startStreamAndDetection}
        style={{ zIndex: 3, position: 'relative', marginRight: '10px' }}
        disabled={isStreaming}
      >
        {isLoading ? 'Starting...' : 'Start Livestream'}
      </button>

      <button
        onClick={stopStream}
        style={{ zIndex: 3, position: 'relative' }}
        disabled={!isStreaming}
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
