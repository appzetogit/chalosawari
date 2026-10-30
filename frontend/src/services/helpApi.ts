export interface FAQ {
  _id: string;
  title: string;
  description: string;
  content: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupportSetting {
  _id?: string;
  phone: string;
  email: string;
  whatsapp?: string;
  workingHours?: string;
  callSupportTitle?: string;
  callSupportDescription?: string;
  emailSupportTitle?: string;
  emailSupportDescription?: string;
}

export interface PublicHelpResponse {
  success: boolean;
  message?: string;
  data: {
    faqs: FAQ[];
    supportSettings: SupportSetting;
  };
}

export interface FAQStats {
  totalFaqs: number;
  activeFaqs: number;
  inactiveFaqs: number;
}

export interface FAQStatsResponse {
  success: boolean;
  data: FAQStats;
}

export interface FAQListResponse {
  success: boolean;
  data: FAQ[];
}

export interface FAQSingleResponse {
  success: boolean;
  message?: string;
  data: FAQ;
}

export interface SupportSettingResponse {
  success: boolean;
  message?: string;
  data: SupportSetting;
}

class HelpApiService {
  private baseURL: string;

  constructor() {
    const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
    this.baseURL = envUrl || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');
  }

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('adminToken');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  }

  // Get public FAQs and support contact info (for User app)
  async getPublicHelpData(): Promise<PublicHelpResponse> {
    const response = await fetch(`${this.baseURL}/help-support`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // Get FAQ stats (Admin)
  async getAdminStats(): Promise<FAQStatsResponse> {
    const response = await fetch(`${this.baseURL}/help-support/admin/stats`, {
      headers: this.getAuthHeaders()
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // Get all FAQs for admin
  async getAdminFaqs(search = '', status = 'all'): Promise<FAQListResponse> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status && status !== 'all') params.append('status', status);

    const response = await fetch(`${this.baseURL}/help-support/admin/faqs?${params.toString()}`, {
      headers: this.getAuthHeaders()
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // Create FAQ (Admin)
  async createFaq(faqData: {
    title: string;
    description?: string;
    content: string;
    order?: number;
    isActive?: boolean;
  }): Promise<FAQSingleResponse> {
    const response = await fetch(`${this.baseURL}/help-support/admin/faqs`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(faqData)
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // Update FAQ (Admin)
  async updateFaq(id: string, faqData: Partial<FAQ>): Promise<FAQSingleResponse> {
    const response = await fetch(`${this.baseURL}/help-support/admin/faqs/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(faqData)
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // Delete FAQ (Admin)
  async deleteFaq(id: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseURL}/help-support/admin/faqs/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // Toggle FAQ status (Admin)
  async toggleFaqStatus(id: string): Promise<FAQSingleResponse> {
    const response = await fetch(`${this.baseURL}/help-support/admin/faqs/${id}/status`, {
      method: 'PATCH',
      headers: this.getAuthHeaders()
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // Get Support Settings (Admin)
  async getSupportSettings(): Promise<SupportSettingResponse> {
    const response = await fetch(`${this.baseURL}/help-support/admin/settings`, {
      headers: this.getAuthHeaders()
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // Update Support Settings (Admin)
  async updateSupportSettings(settingsData: Partial<SupportSetting>): Promise<SupportSettingResponse> {
    const response = await fetch(`${this.baseURL}/help-support/admin/settings`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(settingsData)
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }
}

export const helpApi = new HelpApiService();
