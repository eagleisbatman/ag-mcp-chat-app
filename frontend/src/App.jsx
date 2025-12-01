import React, { useState, useEffect, useRef } from 'react';
import ChatInterface from './components/ChatInterface';
import LocationManager from './components/LocationManager';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function App() {
  const [deviceId, setDeviceId] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);

  useEffect(() => {
    // Get or create device ID
    let storedDeviceId = localStorage.getItem('farmerchat-device-id');
    if (!storedDeviceId) {
      storedDeviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('farmerchat-device-id', storedDeviceId);
    }
    setDeviceId(storedDeviceId);
  }, []);

  const handleLocationUpdate = async (coords) => {
    setLocation(coords);
    setLocationError(null);

    // Save location to backend
    if (deviceId) {
      try {
        await fetch(`${API_URL}/api/user/location`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            device_id: deviceId,
            latitude: coords.latitude,
            longitude: coords.longitude,
            country: coords.country,
            city: coords.city
          })
        });
      } catch (error) {
        console.error('[App] Error saving location:', error);
      }
    }
  };

  const handleLocationError = (error) => {
    setLocationError(error);
    // Use default location (Nairobi)
    setLocation({
      latitude: -1.2864,
      longitude: 36.8172,
      source: 'default',
      country: 'Kenya',
      city: 'Nairobi'
    });
  };

  return (
    <div className="app">
      <LocationManager
        onLocationUpdate={handleLocationUpdate}
        onLocationError={handleLocationError}
      />
      {deviceId && (
        <ChatInterface
          deviceId={deviceId}
          location={location}
          locationError={locationError}
          apiUrl={API_URL}
        />
      )}
    </div>
  );
}

export default App;

