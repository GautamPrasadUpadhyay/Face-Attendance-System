import React, { useRef, useState } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';

const WebcamCapture = () => {
  const webcamRef = useRef(null);
  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const videoConstraints = {
    width: 640,
    height: 480,
    facingMode: "user",
  };

  const captureAndSend = async () => {
    setIsProcessing(true);
    setMessage('');
    
    try {
      const imageSrc = webcamRef.current.getScreenshot();
      const blob = await fetch(imageSrc).then(res => res.blob());
      const formData = new FormData();
      formData.append('image', blob, 'snapshot.jpg');

      const res = await axios.post('http://localhost:5000/mark-attendance', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const names = res.data.recognized;
      if (names.length > 0) {
        setMessage(`✅ Attendance marked: ${names.join(', ')}`);
      } else {
        setMessage('⚠️ No face recognized in the image');
      }
    } catch (err) {
      setMessage('❌ Error connecting to backend.');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="webcam-container">
      <div className="camera-frame">
        <div className="camera-overlay">
          <div className="corner top-left"></div>
          <div className="corner top-right"></div>
          <div className="corner bottom-left"></div>
          <div className="corner bottom-right"></div>
        </div>
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={videoConstraints}
          mirrored={true}
          className="webcam-video"
        />
      </div>
      <div className="camera-controls">
        <button 
          onClick={captureAndSend}
          disabled={isProcessing}
          className={`capture-button ${isProcessing ? 'processing' : ''}`}
        >
          {isProcessing ? (
            <>
              <span className="spinner"></span>
              Processing...
            </>
          ) : (
            <>
              <span className="camera-icon">📸</span>
              Mark Attendance
            </>
          )}
        </button>
      </div>
      {message && (
        <div className={`message ${
          message.includes('❌') ? 'error-message' : 
          message.includes('⚠️') ? 'warning-message' : 
          'success-message'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default WebcamCapture;
