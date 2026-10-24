/**
 * WasteWise Pune - Secure Backend API Client
 * 
 * Enforces same-origin credentialed requests (HttpOnly session cookies)
 * and CSRF defense headers for all state-changing operational calls.
 */

export interface ApiUser {
  id: string;
  name: string;
  role: 'municipal_head' | 'ward_supervisor' | 'driver';
  userType: 'officer' | 'driver';
  assignedWardId?: string | null;
  assignedTruckId?: string | null;
  identifier?: string;
  phone?: string;
}

export class ApiError extends Error {
  statusCode: number;
  code?: string;
  details?: any;

  constructor(message: string, statusCode: number, code?: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest',
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  let res: Response;
  try {
    res = await fetch(endpoint, {
      ...options,
      headers,
      credentials: 'include', // Always send HttpOnly session cookie
    });
  } catch (networkErr: any) {
    // Catch fetch network errors (e.g., backend server not running, connection refused)
    throw new ApiError(
      'Authentication service cannot be reached. Please ensure the backend server is running on port 5000.',
      0,
      'NETWORK_FAILURE',
      networkErr
    );
  }

  if (res.status === 401) {
    // Session expired or unauthenticated
    const data = await res.json().catch(() => ({}));
    throw new ApiError(
      data.error || 'Invalid username or password. Please verify your credentials.',
      401,
      data.code || 'INVALID_CREDENTIALS'
    );
  }

  if (res.status === 502 || res.status === 503 || res.status === 504) {
    throw new ApiError(
      'Authentication service cannot be reached. Please ensure the backend server is running on port 5000.',
      res.status,
      'SERVICE_UNAVAILABLE'
    );
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    const fallbackMessage = res.status >= 500
      ? 'A server error occurred while processing your request. Please try again later.'
      : `Request failed (HTTP ${res.status}).`;
    throw new ApiError(
      errorData?.error || fallbackMessage,
      res.status,
      errorData?.code,
      errorData?.details
    );
  }

  return res.json() as Promise<T>;
}

export const authApi = {
  async loginOfficer(identifier: string, password: string): Promise<{ user: ApiUser }> {
    return apiFetch<{ user: ApiUser }>('/api/auth/officer/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
  },

  async requestDriverOtp(phone: string): Promise<{ message: string; validForSeconds: number }> {
    return apiFetch<{ message: string; validForSeconds: number }>('/api/auth/driver/request-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  },

  async verifyDriverOtp(phone: string, otp: string): Promise<{ user: ApiUser }> {
    return apiFetch<{ user: ApiUser }>('/api/auth/driver/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
    });
  },

  async getDevOtpPreview(phone: string): Promise<{ devOtp: string } | null> {
    try {
      return await apiFetch<{ devOtp: string }>(`/api/auth/driver/dev-otp-preview?phone=${encodeURIComponent(phone)}`);
    } catch {
      return null;
    }
  },

  async getMe(): Promise<{ user: ApiUser }> {
    return apiFetch<{ user: ApiUser }>('/api/auth/me');
  },

  async logout(): Promise<void> {
    await apiFetch('/api/auth/logout', { method: 'POST' });
  },
};

export const dashboardApi = {
  async getDashboard(): Promise<any> {
    return apiFetch<any>('/api/dashboard');
  },
};

export const dispatchApi = {
  async reassignBin(binId: string, newTruckId: string | null): Promise<any> {
    return apiFetch('/api/dispatch/reassign', {
      method: 'POST',
      body: JSON.stringify({ binId, newTruckId }),
    });
  },

  async simulateSensorSpike(binId: string, newFillPercent: number): Promise<any> {
    return apiFetch('/api/dispatch/simulate-sensor', {
      method: 'POST',
      body: JSON.stringify({ binId, newFillPercent }),
    });
  },

  async getActivityStream(limit = 20): Promise<{ activities: any[] }> {
    return apiFetch<{ activities: any[] }>(`/api/dispatch/activity-stream?limit=${limit}`);
  },
};

export const collectionsApi = {
  async recordCollection(
    binId: string,
    truckId: string,
    action: 'collected' | 'unable_to_collect',
    failureReason?: string,
    notes?: string,
    idempotencyKey?: string
  ): Promise<any> {
    return apiFetch('/api/collections/record', {
      method: 'POST',
      body: JSON.stringify({
        binId,
        truckId,
        action,
        failureReason,
        notes,
        idempotencyKey,
      }),
    });
  },
};

export const driverApi = {
  async getRoute(): Promise<any> {
    return apiFetch('/api/driver/route');
  },
};

export const complaintsApi = {
  async submitComplaint(formData: FormData): Promise<any> {
    return apiFetch('/api/complaints', {
      method: 'POST',
      body: formData,
    });
  },

  async getComplaints(): Promise<any> {
    return apiFetch('/api/complaints');
  },

  async updateComplaint(id: string, status: string, resolutionNotes?: string): Promise<any> {
    return apiFetch(`/api/complaints/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, resolutionNotes }),
    });
  },
};
