/**
 * geocoder.js
 * Local fallback for geocoding common startup hubs.
 * Used when API credits are depleted to ensure spatial visualization works.
 */

const HUB_MAP = {
  "san francisco": { lat: 37.7749, lng: -122.4194 },
  "san francisco, ca": { lat: 37.7749, lng: -122.4194 },
  "sf": { lat: 37.7749, lng: -122.4194 },
  "new york": { lat: 40.7128, lng: -74.0060 },
  "new york, ny": { lat: 40.7128, lng: -74.0060 },
  "nyc": { lat: 40.7128, lng: -74.0060 },
  "palo alto": { lat: 37.4419, lng: -122.1430 },
  "palo alto, ca": { lat: 37.4419, lng: -122.1430 },
  "mountain view": { lat: 37.3861, lng: -122.0839 },
  "mountain view, ca": { lat: 37.3861, lng: -122.0839 },
  "london": { lat: 51.5074, lng: -0.1278 },
  "london, uk": { lat: 51.5074, lng: -0.1278 },
  "bangalore": { lat: 12.9716, lng: 77.5946 },
  "bengaluru": { lat: 12.9716, lng: 77.5946 },
  "san mateo": { lat: 37.5630, lng: -122.3255 },
  "san mateo, ca": { lat: 37.5630, lng: -122.3255 },
  "seattle": { lat: 47.6062, lng: -122.3321 },
  "seattle, wa": { lat: 47.6062, lng: -122.3321 },
  "boston": { lat: 42.3601, lng: -71.0589 },
  "boston, ma": { lat: 42.3601, lng: -71.0589 },
  "austin": { lat: 30.2672, lng: -97.7431 },
  "austin, tx": { lat: 30.2672, lng: -97.7431 },
  "remote": { lat: 0, lng: 0 } // Plotted at Null Island or handled in UI
};

function localGeocode(locationStr) {
  if (!locationStr) return null;
  const normalized = locationStr.toLowerCase().trim();
  
  // Direct match
  if (HUB_MAP[normalized]) return HUB_MAP[normalized];
  
  // Fuzzy match (starts with)
  for (const [name, coords] of Object.entries(HUB_MAP)) {
    if (normalized.startsWith(name) || name.startsWith(normalized)) {
      return coords;
    }
  }

  return null;
}

module.exports = { localGeocode };
