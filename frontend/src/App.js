import React, { useState, useEffect, createContext } from 'react';
import WebcamCapture from './components/webcamCapture';
import AttendanceTable from './components/AttendanceTable';
import './styles.css';

// Create theme context
export const ThemeContext = createContext();

function App() {
  // Initialize theme from localStorage or default to 'light'
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  // Update theme in localStorage when it changes
  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className={`app ${theme}`}>
        <div className="header">
          <div className="theme-toggle">
            <button 
              onClick={toggleTheme} 
              className="theme-toggle-button"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
          <h1>Face Attendance System</h1>
          <p className="subtitle">Automated attendance tracking using facial recognition</p>
        </div>
        
        <div className="main-content">
          <div className="webcam-section">
            <div className="card">
              <h2>Camera Feed</h2>
              <WebcamCapture />
            </div>
          </div>
          
          <div className="attendance-section">
            <div className="card">
              <h2>Attendance Log</h2>
              <AttendanceTable />
            </div>
          </div>
        </div>
      </div>
    </ThemeContext.Provider>
  );
}

export default App;

