import { api } from './client';
import type {
  User,
  AuthResponse,
  University,
  Course,
  CourseSummary,
  TrackedProgram,
  TrackerStats,
  DeadlineItem,
  GhadamTransaction,
  CreateTrackedProgramRequest,
  UpdateTrackedProgramRequest,
  UserGoal,
  ApplicationStatus,
  Priority,
} from '../types';

// Auth
export const authApi = {
  requestOTP: (phone: string) =>
    api.post<{ message: string; debug_code?: string }>('/auth/request-otp', { phone }),
  
  verifyOTP: (phone: string, code: string) =>
    api.post<AuthResponse>('/auth/verify-otp', { phone, code }),
  
  getMe: () => api.get<User>('/auth/me'),
  
  updateMe: (data: Partial<User>) => api.patch<User>('/auth/me', data),
  
  setGoal: (goal: UserGoal) => api.post<User>('/auth/onboarding', { goal }),
  
  completeOnboarding: () => api.post<User>('/auth/onboarding/complete'),
};

// Tracker
export const trackerApi = {
  listPrograms: (status?: ApplicationStatus, priority?: Priority) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (priority) params.set('priority', priority);
    const query = params.toString();
    return api.get<TrackedProgram[]>(`/tracker/programs${query ? `?${query}` : ''}`);
  },
  
  getProgram: (id: number) => api.get<TrackedProgram>(`/tracker/programs/${id}`),
  
  addProgram: (data: CreateTrackedProgramRequest) =>
    api.post<TrackedProgram>('/tracker/programs', data),
  
  updateProgram: (id: number, data: UpdateTrackedProgramRequest) =>
    api.patch<TrackedProgram>(`/tracker/programs/${id}`, data),
  
  deleteProgram: (id: number) => api.delete<{ ok: boolean }>(`/tracker/programs/${id}`),
  
  getStats: () => api.get<TrackerStats>('/tracker/stats'),
  
  getDeadlines: (days = 90) => api.get<DeadlineItem[]>(`/tracker/deadlines?days=${days}`),
  
  updateChecklist: (id: number, checklist: Array<{ name: string; required: boolean; completed: boolean }>) =>
    api.patch<{ ok: boolean }>(`/tracker/programs/${id}/checklist`, checklist),
};

// Universities
export const universityApi = {
  list: (params?: { query?: string; country?: string; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.query) searchParams.set('query', params.query);
    if (params?.country) searchParams.set('country', params.country);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return api.get<University[]>(`/universities${query ? `?${query}` : ''}`);
  },
  
  get: (id: number) => api.get<University>(`/universities/${id}`),
  
  getCountries: () => api.get<Array<{ country: string; count: number }>>('/universities/countries'),
  
  getCourses: (id: number) => api.get<Course[]>(`/universities/${id}/courses`),
};

// Courses
export const courseApi = {
  search: (params?: {
    query?: string;
    field?: string;
    country?: string;
    degree_level?: string;
    tuition_free_only?: boolean;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.query) searchParams.set('query', params.query);
    if (params?.field) searchParams.set('field', params.field);
    if (params?.country) searchParams.set('country', params.country);
    if (params?.degree_level) searchParams.set('degree_level', params.degree_level);
    if (params?.tuition_free_only) searchParams.set('tuition_free_only', 'true');
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return api.get<Course[]>(`/courses${query ? `?${query}` : ''}`);
  },
  
  autocomplete: (q: string) => api.get<CourseSummary[]>(`/courses/autocomplete?q=${encodeURIComponent(q)}`),
  
  get: (id: number) => api.get<Course>(`/courses/${id}`),
  
  getFields: () => api.get<Array<{ field: string; count: number }>>('/courses/fields'),
  
  getStats: (id: number) => api.get<{
    course_id: number;
    total_applications: number;
    accepted: number;
    rejected: number;
    acceptance_rate: number | null;
  }>(`/courses/${id}/stats`),
};

// Ghadam
export const ghadamApi = {
  getBalance: () => api.get<{ balance: number; user_id: number }>('/ghadam/balance'),
  
  getTransactions: (limit = 20, offset = 0) =>
    api.get<GhadamTransaction[]>(`/ghadam/transactions?limit=${limit}&offset=${offset}`),
  
  getPricing: () => api.get<{
    profile_view_cost: number;
    contributor_share: number;
    rewards: Record<string, number>;
  }>('/ghadam/pricing'),
  
  purchaseView: (profileId: number) =>
    api.post<{ ok: boolean; new_balance: number }>(`/ghadam/purchase-view/${profileId}`),
};
