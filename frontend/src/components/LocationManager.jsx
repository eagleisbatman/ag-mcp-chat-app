import { useEffect } from 'react';

function LocationManager({ onLocationUpdate, onLocationError }) {
  useEffect(() => {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      onLocationError('Geolocation is not supported by your browser');
      return;
    }

    // Try to get cached location first
    const cachedLocation = localStorage.getItem('farmerchat-location');
    if (cachedLocation) {
      try {
        const location = JSON.parse(cachedLocation);
        const cacheAge = Date.now() - (location.timestamp || 0);
        // Use cache if less than 24 hours old
        if (cacheAge < 24 * 60 * 60 * 1000) {
          onLocationUpdate(location);
          return;
        }
      } catch (e) {
        // Invalid cache, continue to request
      }
    }

    // Request current location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          source: 'gps',
          timestamp: Date.now()
        };

        // Cache location
        localStorage.setItem('farmerchat-location', JSON.stringify(location));

        // Detect country/city (simplified)
        const country = detectCountry(location.latitude, location.longitude);
        location.country = country;
        location.city = country === 'Ethiopia' ? 'Ethiopia' : country === 'Kenya' ? 'Nairobi' : 'Unknown';

        onLocationUpdate(location);
      },
      (error) => {
        let errorMessage = 'Unable to get your location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        onLocationError(errorMessage);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }, [onLocationUpdate, onLocationError]);

  return null; // This component doesn't render anything
}

function detectCountry(lat, lon) {
  // Ethiopia bounds
  if (lat >= 3.0 && lat <= 15.0 && lon >= 32.0 && lon <= 48.0) {
    return 'Ethiopia';
  }
  // Kenya bounds
  if (lat >= -4.7 && lat <= 5.5 && lon >= 33.9 && lon <= 41.9) {
    return 'Kenya';
  }
  // Tanzania bounds
  if (lat >= -11.7 && lat <= -0.9 && lon >= 29.3 && lon <= 40.3) {
    return 'Tanzania';
  }
  return 'Unknown';
}

export default LocationManager;

