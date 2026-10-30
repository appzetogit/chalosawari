import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL) ||
  (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');

export interface VehicleVariant {
  id: string;
  category: 'car' | 'bus';
  name: string;
  icon?: string;
  description?: string;
  defaultCapacity?: number;
  isActive: boolean;
  sortOrder?: number;
}

export interface VehicleModelItem {
  id: string;
  category: 'car' | 'bus';
  variantName: string;
  brand: string;
  modelName: string;
  seatingCapacity: number;
  luggageCapacity?: number;
  fuelTypes: ('petrol' | 'diesel' | 'cng' | 'electric' | 'hybrid')[];
  defaultFuelType: 'petrol' | 'diesel' | 'cng' | 'electric' | 'hybrid';
  mileage: number; // km per liter / kg
  baseFare?: number;
  perKmRate?: number;
  driverAllowancePerDay?: number;
  minKmPerDay?: number;
  isAcDefault?: boolean;
  isActive: boolean;
  notes?: string;
}

export interface FuelRates {
  petrol: number;
  diesel: number;
  cng: number;
  electric: number;
  lastUpdated?: string;
}

export interface VehicleSettingsResponse {
  variants: VehicleVariant[];
  models: VehicleModelItem[];
  groupedModels?: {
    car: Record<string, VehicleModelItem[]>;
    bus: Record<string, VehicleModelItem[]>;
  };
  fuelRates: FuelRates;
  platformFee?: number;
  advancePercentage?: number;
}

export interface TripCostParams {
  distance: number; // in KM (e.g. 200 for Indore to Bhopal)
  modelId?: string;
  modelName?: string;
  fuelType?: string;
  tripType?: 'one-way' | 'return';
  days?: number;
  customMileage?: number;
  customFuelRate?: number;
}

export interface TripCostBreakdown {
  effectiveTravelKm: number;
  minBillableKm: number;
  billableKm: number;
  fuelLitersRequired: number;
  fuelRatePerUnit: number;
  estimatedFuelCost: number;
  driverAllowancePerDay: number;
  totalDriverAllowance: number;
  perKmRate: number;
  distanceFare: number;
  baseFare: number;
  totalEstimatedFare: number;
  totalOperatingCost: number;
  estimatedNetMargin: number;
  profitMarginPercentage: number;
}

export interface TripCostCalculationResponse {
  inputs: {
    distance: number;
    tripType: string;
    days: number;
    fuelType: string;
    modelName: string;
    variantName: string;
    category: string;
    mileage: number;
    fuelRate: number;
  };
  breakdown: TripCostBreakdown;
  formulaSummary: string;
}

// Axios instance with Admin Token
const vehicleSettingApi = axios.create({
  baseURL: `${API_BASE_URL}/vehicle-settings`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

vehicleSettingApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const vehicleSettingService = {
  // Public Endpoint (Used by Driver Form & Customer Search)
  getPublicVehicleSettings: async (): Promise<VehicleSettingsResponse> => {
    const res = await axios.get(`${API_BASE_URL}/vehicle-settings`);
    return res.data.data;
  },

  // Admin Full Settings
  getAdminVehicleSettings: async (): Promise<{ variants: VehicleVariant[]; models: VehicleModelItem[]; fuelRates: FuelRates; platformFee?: number; advancePercentage?: number }> => {
    const res = await vehicleSettingApi.get('/admin');
    return res.data.data;
  },

  // Variant CRUD
  createVariant: async (data: Partial<VehicleVariant>): Promise<VehicleVariant> => {
    const res = await vehicleSettingApi.post('/variants', data);
    return res.data.data;
  },

  updateVariant: async (id: string, data: Partial<VehicleVariant>): Promise<VehicleVariant> => {
    const res = await vehicleSettingApi.put(`/variants/${id}`, data);
    return res.data.data;
  },

  deleteVariant: async (id: string): Promise<void> => {
    await vehicleSettingApi.delete(`/variants/${id}`);
  },

  // Model CRUD
  createModel: async (data: Partial<VehicleModelItem>): Promise<VehicleModelItem> => {
    const res = await vehicleSettingApi.post('/models', data);
    return res.data.data;
  },

  updateModel: async (id: string, data: Partial<VehicleModelItem>): Promise<VehicleModelItem> => {
    const res = await vehicleSettingApi.put(`/models/${id}`, data);
    return res.data.data;
  },

  deleteModel: async (id: string): Promise<void> => {
    await vehicleSettingApi.delete(`/models/${id}`);
  },

  // Fuel Rates Update
  updateFuelRates: async (data: Partial<FuelRates>): Promise<FuelRates> => {
    const res = await vehicleSettingApi.put('/fuel-rates', data);
    return res.data.data;
  },

  // Flat platform fee (₹) added to every booking
  updatePlatformFee: async (platformFee: number): Promise<{ platformFee: number }> => {
    const res = await vehicleSettingApi.put('/platform-fee', { platformFee });
    return res.data.data;
  },

  // % of booking total paid online at booking time (100 = full online)
  updateAdvancePercentage: async (advancePercentage: number): Promise<{ advancePercentage: number }> => {
    const res = await vehicleSettingApi.put('/advance-percentage', { advancePercentage });
    return res.data.data;
  },

  // Savaari-style Trip Cost Estimator
  calculateTripCost: async (params: TripCostParams): Promise<TripCostCalculationResponse> => {
    const res = await axios.post(`${API_BASE_URL}/vehicle-settings/calculate-trip-cost`, params);
    return res.data.data;
  }
};

export default vehicleSettingService;
