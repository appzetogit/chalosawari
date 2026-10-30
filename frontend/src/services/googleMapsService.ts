// Google Maps Places API service for location autocomplete
export interface LocationSuggestion {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

class GoogleMapsService {
  private apiKey: string;
  private isInitialized: boolean = false;
  private isInitializing: boolean = false;
  private scriptLoaded: boolean = false;

  private userLocation: { lat: number; lng: number } | null = null;

  constructor() {
    // Key is served by the backend (/api/config/maps-key); env value is only a local fallback
    this.apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  }

  // Fetch the Maps key from the backend so it is managed in one place
  private async loadApiKey(): Promise<void> {
    try {
      const base = import.meta.env.VITE_API_BASE_URL || '/api';
      const res = await fetch(`${base}/config/maps-key`);
      const data = await res.json();
      if (data?.key) this.apiKey = data.key;
    } catch (error) {
      console.warn('Could not fetch Google Maps key from backend, using env fallback');
    }
  }

  getApiKey(): string {
    return this.apiKey;
  }

  // Ask once for the device location so suggestions are biased to where the user is
  private loadUserLocation(): void {
    navigator.geolocation?.getCurrentPosition(
      (pos) => { this.userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude }; },
      () => { /* denied/unavailable: suggestions stay India-wide */ },
      { timeout: 10000, maximumAge: 300000 }
    );
  }

  // Initialize Google Maps services
  async initialize(): Promise<void> {
    // Prevent multiple simultaneous initializations
    if (this.isInitializing) {
      return;
    }
    
    if (this.isInitialized) {
      return;
    }
    
    this.isInitializing = true;

    try {
      await this.loadApiKey();
      if (!this.apiKey) {
        console.warn('Google Maps API key not configured on backend (GOOGLE_MAPS_API_KEY). Location features disabled.');
        return;
      }
      this.loadUserLocation();

      if (typeof (window as any).google === 'undefined') {
        await this.loadGoogleMapsScript();
      }
      
      // Wait for the script to fully load
      await this.waitForGoogleMaps();
      
      if ((window as any).google?.maps?.places?.AutocompleteSuggestion) {
        this.isInitialized = true;
        console.log('Google Maps service initialized successfully');
      } else {
        throw new Error('Google Maps failed to load properly - required services not available');
      }
    } catch (error) {
      console.error('Error initializing Google Maps service:', error);
      this.isInitialized = false;
      this.isInitializing = false;
      // Don't throw error, just log it and continue gracefully
      console.warn('Google Maps service initialization failed. Location autocomplete will be disabled.');
      console.warn('Please check your API key and network connection.');
    } finally {
      this.isInitializing = false;
    }
  }

  // Wait for Google Maps to be fully loaded
  private waitForGoogleMaps(): Promise<void> {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds maximum wait time
      
      const checkGoogleMaps = () => {
        attempts++;
        
        if ((window as any).google?.maps?.places?.AutocompleteSuggestion) {
          resolve();
        } else if (attempts >= maxAttempts) {
          reject(new Error('Google Maps failed to load within timeout'));
        } else {
          setTimeout(checkGoogleMaps, 100);
        }
      };
      checkGoogleMaps();
    });
  }

  // Load Google Maps script dynamically
  private loadGoogleMapsScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof (window as any).google !== 'undefined') {
        this.scriptLoaded = true;
        resolve();
        return;
      }

      // Check if script is already being loaded or loaded
      if (this.scriptLoaded) {
        resolve();
        return;
      }

      // Check if script tag already exists
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        this.scriptLoaded = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey}&libraries=places&v=weekly`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        this.scriptLoaded = true;
        resolve();
      };
      script.onerror = () => {
        console.error('Failed to load Google Maps script');
        reject(new Error('Failed to load Google Maps script'));
      };
      
      document.head.appendChild(script);
    });
  }

  // Get location suggestions based on input (Places API New - legacy AutocompleteService can't be enabled on new projects)
  async getLocationSuggestions(input: string): Promise<LocationSuggestion[]> {
    if (!this.isInitialized || !input.trim()) {
      return [];
    }

    try {
      const { suggestions } = await (window as any).google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        includedRegionCodes: ['in'], // Restrict to India
        language: 'en',
        region: 'in',
        // Prefer places near the user's current location when we have it
        ...(this.userLocation && {
          locationBias: { center: this.userLocation, radius: 50000 }
        })
      });

      return (suggestions || [])
        .filter((s: any) => s.placePrediction)
        .map(({ placePrediction: p }: any) => ({
          place_id: p.placeId,
          description: p.text?.text || '',
          structured_formatting: {
            main_text: p.mainText?.text || '',
            secondary_text: p.secondaryText?.text || ''
          }
        }));
    } catch (error) {
      console.error('Error getting location suggestions:', error);
      return [];
    }
  }

  // Get place details by place_id, returned in the legacy shape callers expect
  // (geometry.location.lat(), address_components[].long_name, formatted_address)
  async getPlaceDetails(placeId: string): Promise<any> {
    if (!this.isInitialized || !placeId || placeId === 'current_location') {
      return null;
    }

    try {
      const { Place } = (window as any).google.maps.places;
      const p = new Place({ id: placeId });
      await p.fetchFields({ fields: ['displayName', 'formattedAddress', 'location', 'addressComponents', 'types'] });

      const place: any = {
        name: p.displayName,
        formatted_address: p.formattedAddress,
        geometry: { location: p.location },
        place_id: placeId,
        types: p.types,
        address_components: (p.addressComponents || []).map((c: any) => ({
          long_name: c.longText,
          short_name: c.shortText,
          types: c.types
        }))
      };

      // Process address components to extract detailed information
      const addressComponents = place.address_components || [];
      const detailedAddress = {
        street_number: '',
        route: '',
        sublocality: '', // Village/Neighborhood
        locality: '', // City
        administrative_area_level_2: '', // District
        administrative_area_level_1: '', // State
        country: '',
        postal_code: '',
        formatted_address: place.formatted_address
      };

      // Map address components to our structure
      addressComponents.forEach((component: any) => {
        const types = component.types;
        if (types.includes('street_number')) {
          detailedAddress.street_number = component.long_name;
        } else if (types.includes('route')) {
          detailedAddress.route = component.long_name;
        } else if (types.includes('sublocality') || types.includes('neighborhood')) {
          detailedAddress.sublocality = component.long_name;
        } else if (types.includes('locality')) {
          detailedAddress.locality = component.long_name;
        } else if (types.includes('administrative_area_level_2')) {
          detailedAddress.administrative_area_level_2 = component.long_name;
        } else if (types.includes('administrative_area_level_1')) {
          detailedAddress.administrative_area_level_1 = component.long_name;
        } else if (types.includes('country')) {
          detailedAddress.country = component.long_name;
        } else if (types.includes('postal_code')) {
          detailedAddress.postal_code = component.long_name;
        }
      });

      // Add detailed address to the place object
      place.detailedAddress = detailedAddress;

      return place;
    } catch (error) {
      console.error('Error getting place details:', error);
      return null;
    }
  }

  // Check if service is ready
  isReady(): boolean {
    // If no API key, service is not ready but that's expected
    if (!this.apiKey) {
return false;
    }
    return this.isInitialized;
  }

  // Force re-initialization
  async reinitialize(): Promise<void> {
    // Only reinitialize if not already initialized or if there's an issue
    if (!this.isInitialized && !this.isInitializing) {
await this.initialize();
    }
  }
}

// Create and export a singleton instance
export const googleMapsService = new GoogleMapsService();

// Initialize the service when the module is imported
googleMapsService.initialize().catch(console.error);
