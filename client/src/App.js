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
  const isStreamingRef = useRef(false);

  // Initialize Human model
  const humanConfig = {
    backend: 'webgl',
    modelBasePath: 'https://vladmandic.github.io/human/models',
    cacheSensitivity: 0,
    async: true,
    warmup: 'none',
    face: { enabled: false }, // Face detection disabled
    hand: { enabled: false },
    body: { enabled: true },
  };

  const human = new Human(humanConfig);

  const handlePhoneNumberSubmit = (e) => {
    e.preventDefault();
    userPhoneNumber.current = phoneNumber;
    console.log(`Phone number saved: ${userPhoneNumber.current}`);
  };

  const startStreamAndDetection = async () => {
    try {
      await human.load();
      await human.warmup();

      setIsLoading(true);

      navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          streamRef.current = stream;

          setIsStreaming(true);
          isStreamingRef.current = true;

          detectFall();
        })
        .catch((err) => {
          console.error("Error accessing webcam:", err);
        });
    } catch (error) {
      console.error('Error initializing Human:', error);
    }
  };

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
    isStreamingRef.current = false;
    setIsLoading(false);
  };

  const detectFall = async () => {
    const detect = async () => {
      try {
        if (!isStreamingRef.current) return;

        const result = await human.detect(videoRef.current);
        const poses = result.body;

        if (poses && poses.length > 0) {
          const pose = poses[0];
          const fall = isFallDetected(pose);
          drawCanvas(pose, videoRef.current, canvasRef.current, fall);

          if (fall) {
            setFallDetected(true);
            console.log("Patient Fell!")
          } else {
            setFallDetected(false);
          }
        } else {
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
    const leftShoulder = keypoints.find(k => k.part === 'leftShoulder');
    const rightShoulder = keypoints.find(k => k.part === 'rightShoulder');
    const leftHip = keypoints.find(k => k.part === 'leftHip');
    const rightHip = keypoints.find(k => k.part === 'rightHip');

    if (leftShoulder && rightShoulder && leftHip && rightHip) {
      const shouldersY = (leftShoulder.position[1] + rightShoulder.position[1]) / 2;
      const hipsY = (leftHip.position[1] + rightHip.position[1]) / 2;
      const shouldersX = (leftShoulder.position[0] + rightShoulder.position[0]) / 2;
      const hipsX = (leftHip.position[0] + rightHip.position[0]) / 2;

      const deltaY = hipsY - shouldersY;
      const deltaX = hipsX - shouldersX;

      const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

      if (Math.abs(angle) < 90 || Math.abs(angle) > 180) {
        console.log("ANGLE", angle)
        triggerEmergencyCall(phoneNumber)
        return true;
      }
    }

    return false;
  };

  const drawKeypoints = (keypoints, minConfidence, ctx, color = 'aqua') => {
    keypoints.forEach((keypoint) => {
      if (keypoint.score >= minConfidence) {
        // Only draw the nose for face keypoints
        if (keypoint.part === 'nose' || !isFaceKeypoint(keypoint.part)) {
          const [x, y] = keypoint.position;
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
        }
      }
    });
  };

  // Helper function to determine if a keypoint is a face keypoint (excluding nose)
  const isFaceKeypoint = (part) => {
    const faceKeypoints = [
      'leftEye', 'rightEye', 'leftEar', 'rightEar', 'leftEyeInner', 'leftEyeOuter',
      'rightEyeInner', 'rightEyeOuter', 'leftCheek', 'rightCheek', 'mouthLeft', 'mouthRight'
    ];
    return faceKeypoints.includes(part);
  };

  const drawSkeleton = (keypoints, minConfidence, ctx, color = 'red', lineWidth = 2) => {
    const adjacentKeyPoints = [
      { partA: 'leftShoulder', partB: 'rightShoulder' },
      { partA: 'leftShoulder', partB: 'leftElbow' },
      { partA: 'leftElbow', partB: 'leftWrist' },
      { partA: 'rightShoulder', partB: 'rightElbow' },
      { partA: 'rightElbow', partB: 'rightWrist' },
      { partA: 'leftHip', partB: 'rightHip' },
      { partA: 'leftShoulder', partB: 'leftHip' },
      { partA: 'rightShoulder', partB: 'rightHip' },
      { partA: 'leftHip', partB: 'leftKnee' },
      { partA: 'leftKnee', partB: 'leftAnkle' },
      { partA: 'rightHip', partB: 'rightKnee' },
      { partA: 'rightKnee', partB: 'rightAnkle' },
    ];

    adjacentKeyPoints.forEach(({ partA, partB }) => {
      const keypointA = keypoints.find(k => k.part === partA);
      const keypointB = keypoints.find(k => k.part === partB);

      if (keypointA && keypointB && keypointA.score >= minConfidence && keypointB.score >= minConfidence) {
        drawSegment(keypointA.position, keypointB.position, color, lineWidth, ctx);
      }
    });

    // Connect nose to midpoint between shoulders
    const nose = keypoints.find(k => k.part === 'nose');
    const leftShoulder = keypoints.find(k => k.part === 'leftShoulder');
    const rightShoulder = keypoints.find(k => k.part === 'rightShoulder');

    if (nose && leftShoulder && rightShoulder && nose.score >= minConfidence && leftShoulder.score >= minConfidence && rightShoulder.score >= minConfidence) {
      const midpoint = [
        (leftShoulder.position[0] + rightShoulder.position[0]) / 2,
        (leftShoulder.position[1] + rightShoulder.position[1]) / 2,
      ];
      drawSegment(nose.position, midpoint, color, lineWidth, ctx);
    }
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

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const minConfidence = 0.2;

    if (fall) {
      drawKeypoints(pose.keypoints, minConfidence, ctx, 'red');
      drawSkeleton(pose.keypoints, minConfidence, ctx, 'red');
    } else {
      drawKeypoints(pose.keypoints, minConfidence, ctx, 'red');
      drawSkeleton(pose.keypoints, minConfidence, ctx, 'limegreen');
    }
  };

  const triggerEmergencyCall = (phoneNumber) => {
    axios.post('http://localhost:5001/api/call-caregiver', { toPhoneNumber: phoneNumber }) // Update the URL to match backend port
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
