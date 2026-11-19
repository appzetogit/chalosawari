import apiService from './api';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL) ||
  (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');

interface BookingData {
  vehicleId: string;
  pickup: {
    latitude: number;
    longitude: number;
    address: string;
  };
  destination: {
    latitude: number;
    longitude: number;
    address: string;
  };
  date: string;
  time: string;
  tripType?: string;
  passengers: number;
  paymentMethod: 'cash' | 'razorpay';
  specialRequests?: string;
  returnDate?: string | null;
  paymentId: string; // verified Razorpay payment (from /payments/verify) this booking is paid with
  couponCode?: string;
}

class BookingApiService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // Goes through apiService: refreshes an expired token instead of failing after the user has paid
  private async request(endpoint: string, options: RequestInit = {}) {
    return apiService.request(endpoint, options, 'user');
  }

  // Retries network failures: the server claims the payment once and returns the same booking on a retry
  async createBooking(bookingData: BookingData) {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.request('/bookings', { method: 'POST', body: JSON.stringify(bookingData) });
      } catch (error) {
        const isNetwork = !(error as { status?: number }).status;
        if (!isNetwork || attempt >= 2) throw error;
        await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
      }
    }
  }

  async getUserBookings(status?: string, page: number = 1, limit: number = 10) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (status) {
      params.append('status', status);
    }

    return this.request(`/bookings?${params.toString()}`);
  }

  async getBookingById(bookingId: string) {
    return this.request(`/bookings/${bookingId}`);
  }
}

export default BookingApiService;
