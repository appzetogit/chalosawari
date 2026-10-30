const axios = require('axios');

// ponytail: in-process cache, lost on restart and not shared across instances; fine for the API cost it saves
const cache = new Map();

/**
 * Driving distance in km between two {latitude, longitude} points via Google Routes API.
 * Needs "Routes API" enabled for the key. Returns null when it can't route, so callers fall back.
 */
const getRoadDistanceKm = async (from, to) => {
  const key = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!key) return null;

  const point = (p) => ({ latitude: Number(Number(p.latitude).toFixed(5)), longitude: Number(Number(p.longitude).toFixed(5)) });
  const origin = point(from);
  const destination = point(to);
  const cacheKey = JSON.stringify([origin, destination]);
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  try {
    const { data } = await axios.post(
      'https://routes.googleapis.com/directions/v2:computeRoutes',
      {
        origin: { location: { latLng: origin } },
        destination: { location: { latLng: destination } },
        travelMode: 'DRIVE'
      },
      {
        headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'routes.distanceMeters' },
        timeout: 5000
      }
    );
    const meters = data?.routes?.[0]?.distanceMeters;
    if (!meters) return null;
    const km = Math.round(meters / 100) / 10; // 1 decimal
    cache.set(cacheKey, km);
    return km;
  } catch (error) {
    console.warn('Routes API distance failed:', error.response?.data?.error?.message || error.message);
    return null;
  }
};

module.exports = { getRoadDistanceKm };
