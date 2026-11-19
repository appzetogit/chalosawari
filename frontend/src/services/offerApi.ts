import { resolveUploadsUrls } from '../utils/imageUrl';

interface Offer {
  _id: string;
  title: string;
  description?: string;
  image: string;
  code?: string;
  discountType?: 'percent' | 'flat';
  discountValue?: number;
  maxDiscount?: number;
  usageLimit?: number; // 0 = unlimited
  perUserLimit?: number; // 0 = unlimited
  minBookingAmount?: number;
  vehicleType?: 'all' | 'car' | 'bus';
  validTill?: string | null;
  usedCount?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface OfferResponse {
  success: boolean;
  message?: string;
  data: Offer | Offer[];
  count?: number;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

// Editable offer/coupon fields sent from the admin form
type OfferFields = Pick<Offer, 'title' | 'description' | 'code' | 'discountType' | 'discountValue' | 'maxDiscount' | 'minBookingAmount' | 'vehicleType' | 'usageLimit' | 'perUserLimit'> & { validTill?: string };

const toFormData = (fields: OfferFields, image?: File | null) => {
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null) formData.append(key, String(value));
  });
  if (image) formData.append('image', image);
  return formData;
};

// Coupon accepted at checkout, with the rules needed to recompute its discount
interface AppliedCoupon {
  code: string;
  title: string;
  discount: number;
  discountType: 'percent' | 'flat';
  discountValue: number;
  maxDiscount: number;
  minBookingAmount: number;
}

// Same formula as Offer.applyCoupon on the backend
export const couponDiscountFor = (coupon: AppliedCoupon, amount: number) => {
  if (amount < coupon.minBookingAmount) return 0;
  let discount = coupon.discountType === 'percent'
    ? Math.round(amount * coupon.discountValue / 100)
    : coupon.discountValue;
  if (coupon.discountType === 'percent' && coupon.maxDiscount > 0) discount = Math.min(discount, coupon.maxDiscount);
  return Math.min(discount, amount);
};

interface OfferStats {
  totalOffers: number;
  activeOffers: number;
  inactiveOffers: number;
}

interface OfferStatsResponse {
  success: boolean;
  data: OfferStats;
}

class OfferApiService {
  private baseURL: string;

  constructor() {
    const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
    this.baseURL = envUrl || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');
  }

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('adminToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return resolveUploadsUrls(data);
  }

  // Get all active offers (public)
  async getActiveOffers(): Promise<OfferResponse> {
    const response = await fetch(`${this.baseURL}/offers`);
    return this.parseResponse<OfferResponse>(response);
  }

  // Get all offers (admin only)
  async getAllOffers(page = 1, limit = 10, search = '', status = ''): Promise<OfferResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });

    if (search) params.append('search', search);
    if (status) params.append('status', status);

    const response = await fetch(`${this.baseURL}/offers/admin?${params}`, {
      headers: this.getAuthHeaders()
    });

    return this.parseResponse<OfferResponse>(response);
  }

  // Get offer by ID (admin only)
  async getOfferById(id: string): Promise<OfferResponse> {
    const response = await fetch(`${this.baseURL}/offers/admin/${id}`, {
      headers: this.getAuthHeaders()
    });

    return this.parseResponse<OfferResponse>(response);
  }

  // Create new offer (admin only)
  async createOffer(fields: OfferFields, image?: File | null): Promise<OfferResponse> {
    const formData = toFormData(fields, image);

    const headers = this.getAuthHeaders();
    delete headers['Content-Type']; // Let browser set content-type for FormData

    const response = await fetch(`${this.baseURL}/offers/admin`, {
      method: 'POST',
      headers,
      body: formData
    });

    return this.parseResponse<OfferResponse>(response);
  }

  // Update offer (admin only)
  async updateOffer(id: string, fields: OfferFields, image?: File | null): Promise<OfferResponse> {
    const formData = toFormData(fields, image);

    const headers = this.getAuthHeaders();
    delete headers['Content-Type']; // Let browser set content-type for FormData

    const response = await fetch(`${this.baseURL}/offers/admin/${id}`, {
      method: 'PUT',
      headers,
      body: formData
    });

    return this.parseResponse<OfferResponse>(response);
  }

  // Delete offer (admin only)
  async deleteOffer(id: string): Promise<OfferResponse> {
    const response = await fetch(`${this.baseURL}/offers/admin/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });

    return this.parseResponse<OfferResponse>(response);
  }

  // Check a coupon for the checkout amount (logged-in user)
  async validateCoupon(code: string, amount: number, vehicleType?: string): Promise<AppliedCoupon> {
    const token = localStorage.getItem('token') || localStorage.getItem('userToken') || localStorage.getItem('authToken');
    const response = await fetch(`${this.baseURL}/offers/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code, amount, vehicleType })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) {
      throw new Error(data.message || data.error?.message || 'Invalid coupon code');
    }
    return data.data;
  }

  // Get offer statistics (admin only)
  async getOfferStats(): Promise<OfferStatsResponse> {
    const response = await fetch(`${this.baseURL}/offers/admin/stats`, {
      headers: this.getAuthHeaders()
    });

    return this.parseResponse<OfferStatsResponse>(response);
  }
}

export const offerApi = new OfferApiService();
export type { Offer, OfferFields, OfferResponse, OfferStats, OfferStatsResponse, AppliedCoupon };
