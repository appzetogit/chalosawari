import { resolveUploadsUrls } from '../utils/imageUrl';

export interface CustomerReview {
  id: string;
  rating: number;
  comment: string;
  name: string;
  city: string;
  profilePicture?: string | null;
  ratedAt?: string;
  bookingNumber?: string | null;
  vehicle?: string | null;
}

export interface ReviewResponse {
  success: boolean;
  count: number;
  data: CustomerReview[];
}

class ReviewApiService {
  private baseURL: string;

  constructor() {
    const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
    this.baseURL = envUrl || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');
  }

  // Get real customer reviews for public display
  async getPublicReviews(limit = 10): Promise<ReviewResponse> {
    const response = await fetch(`${this.baseURL}/reviews?limit=${limit}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch reviews: ${response.status}`);
    }
    const data = await response.json();
    return resolveUploadsUrls(data);
  }
}

export const reviewApi = new ReviewApiService();
