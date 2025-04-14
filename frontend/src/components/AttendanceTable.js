import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AttendanceTable = () => {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAttendance = async () => {
    try {
      // Add timestamp to URL to prevent caching
      const timestamp = new Date().getTime();
      const response = await axios.get(`http://localhost:5000/attendance.csv?t=${timestamp}`);
      const rows = response.data.split('\n').filter(row => row.trim());
      const [headers, ...data] = rows;
      
      const parsedData = data.map(row => {
        const [name, time] = row.split(',');
        return { name, time: new Date(time).toLocaleString() };
      });

      setAttendance(parsedData);
      setError(null);
    } catch (err) {
      setError('Failed to load attendance data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
    const interval = setInterval(fetchAttendance, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Filter attendance data based on search query
  const filteredAttendance = attendance.filter(record =>
    record.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get unique attendees count
  const uniqueAttendees = new Set(attendance.map(record => record.name)).size;

  if (loading) {
    return <div className="loading">Loading attendance data...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="attendance-container">
      <div className="table-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button 
              className="clear-search"
              onClick={() => setSearchQuery('')}
            >
              ✕
            </button>
          )}
        </div>
        <button onClick={fetchAttendance} className="refresh-button">
          🔄 Refresh
        </button>
      </div>
      
      {filteredAttendance.length === 0 ? (
        <div className="no-data">
          {searchQuery ? 'No matching records found' : 'No attendance records yet'}
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="attendance-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendance.map((record, index) => (
                <tr key={index}>
                  <td>{record.name}</td>
                  <td>{record.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="table-footer">
            <div className="attendance-summary">
              <div className="summary-item">
                <span className="summary-label">Total Entries:</span>
                <span className="summary-value">{attendance.length}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Unique Attendees:</span>
                <span className="summary-value">{uniqueAttendees}</span>
              </div>
              {searchQuery && (
                <div className="summary-item">
                  <span className="summary-label">Filtered Results:</span>
                  <span className="summary-value">{filteredAttendance.length}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceTable;
