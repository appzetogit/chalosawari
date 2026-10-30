export interface PolicySection {
  _id: string;
  title: string;
  content: string;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export type PolicyType = 'terms' | 'privacy' | 'refund' | 'cancellation' | 'driver-terms' | 'driver-privacy';

export interface Policy {
  _id: string;
  type: PolicyType;
  title: string;
  sections: PolicySection[];
  lastUpdated: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PolicyResponse {
  success: boolean;
  message?: string;
  data: Policy;
}

class PolicyApiService {
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

  // Get policy by type (public)
  async getPolicy(type: PolicyType): Promise<PolicyResponse> {
    const response = await fetch(`${this.baseURL}/policies/${type}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // Get admin policy by type
  async getAdminPolicy(type: PolicyType): Promise<PolicyResponse> {
    const response = await fetch(`${this.baseURL}/policies/admin/${type}`, {
      headers: this.getAuthHeaders()
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // Update policy title / all sections
  async updatePolicy(
    type: PolicyType,
    data: { title?: string; sections?: any[]; isActive?: boolean }
  ): Promise<PolicyResponse> {
    const response = await fetch(`${this.baseURL}/policies/admin/${type}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // Add single section
  async addSection(
    type: PolicyType,
    sectionData: { title: string; content: string; order?: number }
  ): Promise<PolicyResponse> {
    const response = await fetch(`${this.baseURL}/policies/admin/${type}/section`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(sectionData)
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // Update single section
  async updateSection(
    type: PolicyType,
    sectionId: string,
    sectionData: { title?: string; content?: string; order?: number }
  ): Promise<PolicyResponse> {
    const response = await fetch(`${this.baseURL}/policies/admin/${type}/section/${sectionId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(sectionData)
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // Delete single section
  async deleteSection(
    type: PolicyType,
    sectionId: string
  ): Promise<PolicyResponse> {
    const response = await fetch(`${this.baseURL}/policies/admin/${type}/section/${sectionId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }
}

export const policyApi = new PolicyApiService();
