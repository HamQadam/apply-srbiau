import { api } from './client';
import type {
  User,
  AuthResponse,
  University,
  Course,
  CourseSummary,
  CoursesResponse,
  CourseSearchParams,
  TrackedProgram,
  TrackerStats,
  DeadlineItem,
  GhadamTransaction,
  CreateTrackedProgramRequest,
  UpdateTrackedProgramRequest,
  UserGoal,
  ApplicationStatus,
  Priority,
  MatchingProfile,
  MatchingOptions,
  RecommendationsResponse,
  ChecklistItem,
  NoteEntry,
} from '../types';

// Auth
export const authApi = {
  requestOTP: (phone: string) =>
    api.post<{ message: string; debug_code?: string }>('/auth/request-otp', { phone }),

  verifyOTP: (phone: string, code: string) =>
    api.post<AuthResponse>('/auth/verify-otp', { phone, code }),

  googleExchange: (code: string, redirect_uri: string) =>
    api.post<AuthResponse>(
      '/auth/google/exchange',
      { code, redirect_uri },
      { headers: { 'X-Requested-With': 'XMLHttpRequest' } }
    ),

  getMe: () => api.get<User>('/auth/me'),

  updateMe: (data: Partial<User>) => api.patch<User>('/auth/me', data),

  setGoal: (goal: UserGoal) => api.post<User>('/auth/onboarding', { goal }),

  completeOnboarding: () => api.post<User>('/auth/onboarding/complete'),
};

// Matching
export const matchingApi = {
  getOptions: () => api.get<MatchingOptions>('/matching/options'),
  
  getProfile: () => api.get<{ profile: MatchingProfile; completed: boolean }>('/matching/profile'),
  
  saveProfile: (profile: MatchingProfile) =>
    api.post<{
      profile: MatchingProfile;
      completed: boolean;
      bonus_awarded: number;
      new_balance: number;
    }>('/matching/profile', profile),
  
  getRecommendations: (params?: { limit?: number; offset?: number; min_score?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    if (params?.min_score) searchParams.set('min_score', String(params.min_score));
    const query = searchParams.toString();
    return api.get<RecommendationsResponse>(`/matching/recommendations${query ? `?${query}` : ''}`);
  },
  
  getQuickRecommendations: (profile: Partial<MatchingProfile>) =>
    api.post<{ recommendations: Array<{ id: number; program_name: string; university_name: string; country: string; match_score: number; match_reasons: string[] }>; message: string }>(
      '/matching/quick-recommendations',
      profile
    ),
  
  trackRecommendation: (courseId: number, priority: Priority = 'target', intake?: string) =>
    api.post<{ id: number; course_id: number; match_score: number; message: string }>(
      `/matching/recommendations/${courseId}/track`,
      { priority, intake }
    ),
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
  
  // Checklist
  updateChecklist: (id: number, checklist: ChecklistItem[]) =>
    api.patch<{ ok: boolean; checklist: ChecklistItem[] }>(`/tracker/programs/${id}/checklist`, checklist),
  
  addChecklistItem: async (id: number, item: { name: string; required?: boolean; notes?: string }) => {
    const result = await api.post<{ ok: boolean; item: ChecklistItem; checklist: ChecklistItem[] }>(`/tracker/programs/${id}/checklist/items`, item);
    // Return a partial TrackedProgram with the updated checklist
    return { id, document_checklist: result.checklist } as TrackedProgram;
  },

  deleteChecklistItem: async (id: number, itemId: string) => {
    const result = await api.delete<{ ok: boolean; checklist: ChecklistItem[] }>(`/tracker/programs/${id}/checklist/items/${itemId}`);
    // Return a partial TrackedProgram with the updated checklist
    return { id, document_checklist: result.checklist } as TrackedProgram;
  },
  
  // Notes
  getNotes: (id: number) => api.get<{ main_notes: string | null; entries: NoteEntry[] }>(`/tracker/programs/${id}/notes`),
  
  updateMainNotes: (id: number, notes: string) =>
    api.patch<{ ok: boolean; notes: string }>(`/tracker/programs/${id}/notes`, { notes }),
  
  addNoteEntry: async (id: number, entry: { content: string; category: string; pinned?: boolean }) => {
    const result = await api.post<{ ok: boolean; entry: NoteEntry }>(`/tracker/programs/${id}/notes/entries`, entry);
    return result.entry;
  },
  
  updateNoteEntry: async (id: number, entryId: string, data: { content?: string; category?: string; pinned?: boolean }) => {
    const result = await api.patch<{ ok: boolean; entries: NoteEntry[] }>(`/tracker/programs/${id}/notes/entries/${entryId}`, data);
    return result.entries.find(e => e.id === entryId) as NoteEntry;
  },
  
  deleteNoteEntry: (id: number, entryId: string) =>
    api.delete<{ ok: boolean }>(`/tracker/programs/${id}/notes/entries/${entryId}`),
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
  search: (params?: CourseSearchParams) => {
    const searchParams = new URLSearchParams();
    
    if (params?.query) searchParams.set('query', params.query);
    if (params?.field) searchParams.set('field', params.field);
    if (params?.degree_level) searchParams.set('degree_level', params.degree_level);
    if (params?.tuition_free_only) searchParams.set('tuition_free_only', 'true');
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    
    // Multi-select: countries
    if (params?.countries && params.countries.length > 0) {
      params.countries.forEach((c) => searchParams.append('countries', c));
    } else if (params?.country) {
      searchParams.set('country', params.country);
    }
    
    // Multi-select: fields
    if (params?.fields && params.fields.length > 0) {
      params.fields.forEach((f) => searchParams.append('fields', f));
    }
    
    const query = searchParams.toString();
    return api.get<CoursesResponse>(`/courses${query ? `?${query}` : ''}`);
  },
  
  autocomplete: (q: string) => api.get<CourseSummary[]>(`/courses/autocomplete?q=${encodeURIComponent(q)}`),
  
  get: (id: number) => api.get<Course>(`/courses/${id}`),
  
  getFields: (minCount = 5) => api.get<Array<{ field: string; count: number }>>(`/courses/fields?min_count=${minCount}`),
  
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