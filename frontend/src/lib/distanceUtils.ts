// Utility functions for distance calculations and pricing

export interface LocationData {
  lat: number;
  lng: number;
  description: string;
}

export const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  indore: { lat: 22.7196, lng: 75.8577 },
  dewas: { lat: 22.9676, lng: 76.0534 },
  ujjain: { lat: 23.1765, lng: 75.7885 },
  bhopal: { lat: 23.2599, lng: 77.4126 },
  jabalpur: { lat: 23.1815, lng: 79.9864 },
  gwalior: { lat: 26.2183, lng: 78.1828 },
  ratlam: { lat: 23.3315, lng: 75.0367 },
  khandwa: { lat: 21.8314, lng: 76.3498 },
  khargone: { lat: 21.8234, lng: 75.6189 },
  hoshangabad: { lat: 22.7519, lng: 77.7289 },
  narmadapuram: { lat: 22.7519, lng: 77.7289 },
  mhow: { lat: 22.5542, lng: 75.7562 },
  pithampur: { lat: 22.6139, lng: 75.6881 },
  nagda: { lat: 23.4542, lng: 75.4167 },
  sehore: { lat: 23.2033, lng: 77.0844 },
  vidisha: { lat: 23.5251, lng: 77.8081 },
  sagar: { lat: 23.8388, lng: 78.7378 },
  satna: { lat: 24.5828, lng: 80.8322 },
  rewa: { lat: 24.5373, lng: 81.3042 },
  burhanpur: { lat: 21.3109, lng: 76.2294 },
  neemuch: { lat: 24.4646, lng: 74.8722 },
  mandsaur: { lat: 24.0725, lng: 75.0683 },
  shajapur: { lat: 23.4273, lng: 76.2774 },
  agar: { lat: 23.7145, lng: 76.0175 },
  delhi: { lat: 28.6139, lng: 77.2090 },
  mumbai: { lat: 19.0760, lng: 72.8777 },
  pune: { lat: 18.5204, lng: 73.8567 },
  ahmedabad: { lat: 23.0225, lng: 72.5714 },
  jaipur: { lat: 26.9124, lng: 75.7873 },
  kota: { lat: 25.2138, lng: 75.8648 },
  surat: { lat: 21.1702, lng: 72.8311 },
  vadodara: { lat: 22.3072, lng: 73.1812 },
  nagpur: { lat: 21.1458, lng: 79.0882 }
};

export const resolveLocationCoordinates = async (
  cityName: string
): Promise<LocationData> => {
  if (!cityName || !cityName.trim()) {
    return { lat: 22.7196, lng: 75.8577, description: '' };
  }

  const cleanName = cityName.trim().toLowerCase();

  // 1. Check local lookup for exact or partial match
  for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
    if (cleanName.includes(key) || key.includes(cleanName)) {
      return { ...coords, description: cityName };
    }
  }

  // 2. Try Google Maps Geocoder if available
  if (typeof (window as any).google !== 'undefined' && (window as any).google.maps && (window as any).google.maps.Geocoder) {
    try {
      const geocoder = new (window as any).google.maps.Geocoder();
      const res = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
        geocoder.geocode({ address: cityName + ', India' }, (results: any, status: string) => {
          if (status === 'OK' && results && results[0]) {
            const loc = results[0].geometry.location;
            resolve({ lat: loc.lat(), lng: loc.lng() });
          } else {
            resolve(null);
          }
        });
      });
      if (res) {
        return { ...res, description: cityName };
      }
    } catch (e) {
      console.warn('Google geocoding error:', e);
    }
  }

  // 3. Fallback default (Indore default)
  return { lat: 22.7196, lng: 75.8577, description: cityName };
};

/**
 * Calculate distance between two points using Haversine formula
 * @param from - Starting location coordinates
 * @param to - Destination location coordinates
 * @returns Distance in kilometers (rounded to 2 decimal places)
 */
export const calculateDistance = (from: LocationData, to: LocationData): number => {
  if (!from || !to || 
      typeof from.lat !== 'number' || typeof from.lng !== 'number' ||
      typeof to.lat !== 'number' || typeof to.lng !== 'number') {
    return 0;
  }

  const R = 6371; // Earth's radius in kilometers
  const lat1 = from.lat * Math.PI / 180;
  const lat2 = to.lat * Math.PI / 180;
  const deltaLat = (to.lat - from.lat) * Math.PI / 180;
  const deltaLon = (to.lng - from.lng) * Math.PI / 180;

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100;
};

/**
 * Get the appropriate distance-based pricing rate based on trip distance
 * @param distance - Trip distance in kilometers
 * @returns The distance category key (50km, 100km, 150km, 200km, 250km, or 300km)
 */
export const getDistancePricingCategory = (distance: number): '50km' | '100km' | '150km' | '200km' | '250km' | '300km' => {
  if (distance <= 50) {
    return '50km';
  } else if (distance <= 100) {
    return '100km';
  } else if (distance <= 150) {
    return '150km';
  } else if (distance <= 200) {
    return '200km';
  } else if (distance <= 250) {
    return '250km';
  } else {
    return '300km';
  }
};

/**
 * Calculate fare for a vehicle based on distance and trip type
 * @param vehicle - Vehicle object with pricing data
 * @param distance - Trip distance in kilometers
 * @param tripType - Trip type ('one-way' or 'return')
 * @returns Calculated fare amount
 */
export const calculateVehicleFare = (
  vehicle: any,
  distance: number,
  tripType: 'one-way' | 'return' = 'one-way'
): number => {
  if (!vehicle.pricing) {
    return 0;
  }

  // For car and bus vehicles, calculate distance-based pricing
  const distancePricing = vehicle.pricing.distancePricing;
  if (!distancePricing) {
    return 0;
  }

  const pricing = distancePricing[tripType] || distancePricing['one-way'];
  if (!pricing) {
    return 0;
  }

  const distanceCategory = getDistancePricingCategory(distance);
  const ratePerKm = pricing[distanceCategory] || 0;
  // Fare is 2x distance (aane aur jane dono ka / round trip)
  const totalFare = ratePerKm * distance * 2;
  
  return Math.round(totalFare); // Round to whole rupees
};

/**
 * Format price display with proper currency symbol and formatting
 * @param price - Price amount
 * @returns Formatted price string
 */
export const formatPrice = (price: number) => {
  // Round to whole rupees (no decimal places) and format
  const roundedPrice = Math.round(price);
  return `₹${roundedPrice.toLocaleString()}`;
};

/**
 * Get pricing display text based on vehicle type and distance
 * @param vehicle - Vehicle object
 * @param distance - Trip distance in kilometers
 * @param tripType - Trip type
 * @returns Object with price and display text
 */
export const getPricingDisplay = (
  vehicle: any,
  distance: number,
  tripType: 'one-way' | 'return' = 'one-way'
) => {
  if (!vehicle.pricing) {
    return {
      price: 0,
      displayText: 'Pricing Unavailable',
      isValid: false
    };
  }

  // For car and bus vehicles
  const distancePricing = vehicle.pricing.distancePricing;
  if (!distancePricing) {
    return {
      price: 0,
      displayText: 'Pricing Unavailable',
      isValid: false
    };
  }

  const pricing = distancePricing[tripType] || distancePricing['one-way'];
  if (!pricing) {
    return {
      price: 0,
      displayText: 'Pricing Unavailable',
      isValid: false
    };
  }

  const distanceCategory = getDistancePricingCategory(distance);
  const ratePerKm = pricing[distanceCategory] || 0;
  // Fare is 2x distance (aane aur jane dono ka / round trip)
  const totalPrice = Math.round(ratePerKm * distance * 2); // Round to whole rupees

  return {
    price: totalPrice,
    displayText: `${formatPrice(totalPrice)} (${distanceCategory} rate: ₹${ratePerKm}/km × 2)`,
    isValid: totalPrice > 0
  };
};
