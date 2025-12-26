const API_BASE = '/api/v1';

// Helper to get token from localStorage
function getToken(): string | null {
  return localStorage.getItem('apply_token');
}

// Authenticated fetch
async function authFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const token = getToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `HTTP error ${response.status}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// Auth types
export interface User {
  id: number;
  phone: string;
  display_name: string | null;
  role: 'reader' | 'contributor' | 'admin';
  ghadam_balance: number;
  total_earned: number;
  created_at: string;
}

export interface SendOTPResponse {
  message: string;
  phone: string;
}

export interface VerifyOTPResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface MeResponse {
  user: User;
  applicant_id: number | null;
}

// Wallet types
export interface WalletBalance {
  ghadam_balance: number;
  total_earned: number;
  total_spent: number;
  total_withdrawn: number;
  withdrawal_rate: number;
  min_withdrawal: number;
}

export interface Transaction {
  id: number;
  transaction_type: string;
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

export interface RewardRates {
  profile_created: number;
  application_added: number;
  application_with_notes: number;
  document_uploaded: number;
  language_added: number;
  activity_added: number;
  view_earned: number;
  view_price_default: number;
  view_price_premium: number;
  withdrawal_rate: number;
  min_withdrawal: number;
}

// Subscription types
export interface AccessCheck {
  has_access: boolean;
  is_owner: boolean;
  view_price: number | null;
  user_balance: number | null;
}

export interface PurchaseResponse {
  success: boolean;
  message: string;
  new_balance: number | null;
}

// Auth API
export const authApi = {
  sendOTP: (phone: string) =>
    authFetch<SendOTPResponse>('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  verifyOTP: (phone: string, code: string) =>
    authFetch<VerifyOTPResponse>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    }),

  getMe: () => authFetch<MeResponse>('/auth/me'),

  logout: () => authFetch<{ message: string }>('/auth/logout', { method: 'POST' }),
};

// Wallet API
export const walletApi = {
  getBalance: () => authFetch<WalletBalance>('/wallet/balance'),

  getTransactions: (skip = 0, limit = 20) =>
    authFetch<Transaction[]>(`/wallet/transactions?skip=${skip}&limit=${limit}`),

  withdraw: (amount: number) =>
    authFetch<{ success: boolean; message: string; money_value: number }>('/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),

  getRewardRates: () => authFetch<RewardRates>('/wallet/reward-rates'),
};

// Subscription API
export const subscriptionApi = {
  checkAccess: (applicantId: number) =>
    authFetch<AccessCheck>(`/subscriptions/check/${applicantId}`),

  purchaseAccess: (applicantId: number) =>
    authFetch<PurchaseResponse>(`/subscriptions/purchase/${applicantId}`, {
      method: 'POST',
    }),

  getMySubscriptions: () =>
    authFetch<Array<{ id: number; applicant_id: number; ghadams_paid: number; created_at: string }>>(
      '/subscriptions/my-subscriptions'
    ),

  getPreview: (applicantId: number) =>
    authFetch<{
      id: number;
      display_name: string;
      university: string;
      major: string;
      degree_level: string;
      graduation_year: number;
      is_premium: boolean;
      view_price: number;
      total_views: number;
      has_documents: boolean;
      has_applications: boolean;
      application_count: number;
    }>(`/subscriptions/preview/${applicantId}`),
};
