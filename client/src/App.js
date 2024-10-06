import React, { useState, useRef } from 'react';
import axios from 'axios';
import Human from '@vladmandic/human';
import { ReactTyped as Typed } from 'react-typed';
import styled, { keyframes } from 'styled-components';
import { FiPhoneCall, FiPlay, FiStopCircle } from 'react-icons/fi';

const AppContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(to bottom right, #f0f4f8, #d9e2ec);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
`;

const HeaderSection = styled.div`
  text-align: center;
  margin-bottom: 2rem;
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const Title = styled.h1`
  font-size: 5rem;
  color: #102a43;
  animation: ${fadeIn} 2s ease-in;
`;

const Description = styled.h2`
  font-size: 3rem;
  color: #334e68;
  margin-top: 1rem;
  animation: ${fadeIn} 3s ease-in;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 2rem;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 400px;
`;

const Label = styled.label`
  color: #334e68;
  margin-bottom: 0.5rem;
  font-size: 1rem;
`;

const Input = styled.input`
  padding: 0.75rem;
  font-size: 1rem;
  border: 1px solid #bcccdc;
  border-radius: 4px;
  margin-bottom: 1rem;
  width: 100%;
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  margin-bottom: 2rem;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  background-color: ${(props) => (props.$stop ? '#e12d39' : '#2d6cdf')};
  color: #fff;
  font-size: 1rem;
  border: none;
  border-radius: 50px;
  cursor: pointer;
  margin: 0.5rem;
  transition: background-color 0.3s ease;
  display: flex;
  align-items: center;

  &:hover {
    background-color: ${(props) => (props.$stop ? '#981b1e' : '#1b4b91')};
  }

  &:disabled {
    background-color: #9fb3c8;
    cursor: not-allowed;
  }

  svg {
    margin-right: 0.5rem;
  }
`;


const VideoContainer = styled.div`
  width: 100%;
  max-width: 800px;
  aspect-ratio: 16 / 9;
  background-color: #102a43;
  border-radius: 8px;
  overflow: hidden;
  display: grid;
`;

const VideoElement = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
  grid-area: 1 / 1 / 2 / 2;
`;

const CanvasElement = styled.canvas`
  width: 100%;
  height: 100%;
  grid-area: 1 / 1 / 2 / 2;
`;


const AlertOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(225, 45, 57, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const AlertText = styled.p`
  color: #fff;
  font-size: 2rem;
  font-weight: bold;
  text-align: center;
  padding: 0 1rem;
`;

const Message = styled.p`
  color: #2d6cdf;
  text-align: center;
  margin-top: 1rem;
  font-size: 1rem;
`;

function App() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fallDetected, setFallDetected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [message, setMessage] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const userPhoneNumber = useRef('');
  const isStreamingRef = useRef(false);
  const lastCallTimeRef = useRef(null);

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

  const handlePhoneNumberSubmit = (e) => {
    e.preventDefault();
    userPhoneNumber.current = phoneNumber;
    setMessage('Phone number saved successfully!');
    setTimeout(() => setMessage(''), 3000);
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
          setIsLoading(false);

          detectFall();
        })
        .catch((err) => {
          console.error('Error accessing webcam:', err);
          setIsLoading(false);
        });
    } catch (error) {
      console.error('Error initializing Human:', error);
      setIsLoading(false);
    }
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    setIsStreaming(false);
    isStreamingRef.current = false;
    setIsLoading(false);
    setFallDetected(false);
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
            console.log('Patient Fell!');
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
    const leftShoulder = keypoints.find((k) => k.part === 'leftShoulder');
    const rightShoulder = keypoints.find((k) => k.part === 'rightShoulder');
    const leftHip = keypoints.find((k) => k.part === 'leftHip');
    const rightHip = keypoints.find((k) => k.part === 'rightHip');

    if (leftShoulder && rightShoulder && leftHip && rightHip) {
      const shouldersY = (leftShoulder.position[1] + rightShoulder.position[1]) / 2;
      const hipsY = (leftHip.position[1] + rightHip.position[1]) / 2;
      const shouldersX = (leftShoulder.position[0] + rightShoulder.position[0]) / 2;
      const hipsX = (leftHip.position[0] + rightHip.position[0]) / 2;

      const deltaY = hipsY - shouldersY;
      const deltaX = hipsX - shouldersX;

      const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

      if (Math.abs(angle) < 80 || Math.abs(angle) > 110) {
        console.log('ANGLE', angle);
        triggerEmergencyCall(userPhoneNumber.current);
        return true;
      }
    }

    return false;
  };

  const drawKeypoints = (keypoints, minConfidence, ctx, color = 'aqua') => {
    keypoints.forEach((keypoint) => {
      if (keypoint.score >= minConfidence) {
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

  const isFaceKeypoint = (part) => {
    const faceKeypoints = [
      'leftEye',
      'rightEye',
      'leftEar',
      'rightEar',
      'leftEyeInner',
      'leftEyeOuter',
      'rightEyeInner',
      'rightEyeOuter',
      'leftCheek',
      'rightCheek',
      'mouthLeft',
      'mouthRight',
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
      const keypointA = keypoints.find((k) => k.part === partA);
      const keypointB = keypoints.find((k) => k.part === partB);

      if (
        keypointA &&
        keypointB &&
        keypointA.score >= minConfidence &&
        keypointB.score >= minConfidence
      ) {
        drawSegment(keypointA.position, keypointB.position, color, lineWidth, ctx);
      }
    });

    // Connect nose to midpoint between shoulders
    const nose = keypoints.find((k) => k.part === 'nose');
    const leftShoulder = keypoints.find((k) => k.part === 'leftShoulder');
    const rightShoulder = keypoints.find((k) => k.part === 'rightShoulder');

    if (
      nose &&
      leftShoulder &&
      rightShoulder &&
      nose.score >= minConfidence &&
      leftShoulder.score >= minConfidence &&
      rightShoulder.score >= minConfidence
    ) {
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
      drawSkeleton(pose.keypoints, minConfidence, ctx, 'limegreen');
      drawKeypoints(pose.keypoints, minConfidence, ctx, 'red');
    }
  };

  const triggerEmergencyCall = (phoneNumber) => {
    const now = new Date().getTime();

    // Check if the last call was made less than a minute ago
    if (lastCallTimeRef.current && now - lastCallTimeRef.current < 60000) {
      console.log('Call already made in the last minute. Skipping...');
      return; // Skip making another call
    }

    // If enough time has passed, make the call
    lastCallTimeRef.current = now; // Update last call time

    axios
      .post('http://localhost:5001/api/call-caregiver', { toPhoneNumber: phoneNumber })
      .then((response) => {
        console.log('Call initiated:', response.data);
      })
      .catch((error) => {
        console.error('Error initiating call:', error);
      });
  };

  return (
    <AppContainer>
      <HeaderSection>
        <Title>FallSafe</Title>
        <Description>
          <Typed
            strings={[
              'Ensuring safety with real-time monitoring.',
              'AI-powered fall detection for your loved ones.',
              'Immediate alerts when they need it most.',
            ]}
            typeSpeed={40}
            backSpeed={30}
            loop
          />
        </Description>
      </HeaderSection>

      <Form onSubmit={handlePhoneNumberSubmit}>
        <InputGroup>
          <Label htmlFor="phoneNumber">Caregiver's Phone Number</Label>
          <Input
            id="phoneNumber"
            type="tel"
            placeholder="Enter caregiver's phone number"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            required
          />
        </InputGroup>
        <ButtonGroup>
          <Button type="submit">
            <FiPhoneCall />
            Save Number
          </Button>
        </ButtonGroup>
        {message && <Message>{message}</Message>}
      </Form>

      <ButtonGroup>
        <Button onClick={startStreamAndDetection} disabled={isStreaming || isLoading}>
          <FiPlay />
          {isLoading ? 'Starting...' : 'Start Monitoring'}
        </Button>
        <Button onClick={stopStream} $stop disabled={!isStreaming}>
          <FiStopCircle />
          Stop Monitoring
        </Button>
      </ButtonGroup>

      <VideoContainer>
        <VideoElement ref={videoRef} playsInline />
        <CanvasElement ref={canvasRef} />
        {fallDetected && (
          <AlertOverlay>
            <AlertText>Fall Detected! Calling caregiver...</AlertText>
          </AlertOverlay>
        )}
      </VideoContainer>
    </AppContainer>
  );
}

export default App;
