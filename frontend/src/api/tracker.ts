import { api } from './client';
import type {
  TrackedProgram,
  TrackedProgramCreate,
  TrackedProgramUpdate,
  TrackerStats,
  ChecklistItem,
} from '../types';

export const trackerApi = {
  list: (params?: { status?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    const qs = query.toString();
    return api.get<TrackedProgram[]>(`/tracker/programs${qs ? `?${qs}` : ''}`);
  },

  get: (id: number) => api.get<TrackedProgram>(`/tracker/programs/${id}`),

  create: (payload: TrackedProgramCreate) =>
    api.post<TrackedProgram>(`/tracker/programs`, payload),

  update: (id: number, patch: TrackedProgramUpdate) =>
    api.patch<TrackedProgram>(`/tracker/programs/${id}`, patch),

  delete: (id: number) => api.delete(`/tracker/programs/${id}`),

  stats: (days = 30) => api.get<TrackerStats>(`/tracker/stats?days=${days}`),

  deadlines: (days = 30) =>
    api.get<TrackedProgram[]>(`/tracker/deadlines?days=${days}`),

  updateChecklist: (id: number, items: ChecklistItem[]) =>
    api.post<TrackedProgram>(`/tracker/programs/${id}/checklist`, { items }),
};
