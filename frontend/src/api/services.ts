import { api } from './client';
import type {
  Applicant,
  ApplicantCreate,
  ApplicantFull,
  LanguageCredential,
  LanguageCredentialCreate,
  Document,
  ExtracurricularActivity,
  ExtracurricularActivityCreate,
  Application,
  ApplicationCreate,
  UniversityStat,
  CountryStat,
  University,
  UniversityCreate,
  UniversityWithCourses,
  Course,
  CourseCreate,
  CourseWithUniversity,
  CourseAccessStatus,
} from '../types';

// Applicants
export const applicantsApi = {
  list: (params?: { university?: string; major?: string; graduation_year?: number }) => {
    const query = new URLSearchParams();
    if (params?.university) query.set('university', params.university);
    if (params?.major) query.set('major', params.major);
    if (params?.graduation_year) query.set('graduation_year', String(params.graduation_year));
    const qs = query.toString();
    return api.get<Applicant[]>(`/applicants/${qs ? `?${qs}` : ''}`);
  },
  
  get: (id: number) => api.get<Applicant>(`/applicants/${id}`),
  
  getFull: (id: number) => api.get<ApplicantFull>(`/applicants/${id}/full`),
  
  create: (data: ApplicantCreate) => api.post<Applicant>('/applicants/', data),
  
  update: (id: number, data: Partial<ApplicantCreate>) =>
    api.patch<Applicant>(`/applicants/${id}`, data),
  
  delete: (id: number) => api.delete(`/applicants/${id}`),
};

// Language Credentials
export const languagesApi = {
  list: (applicantId: number) =>
    api.get<LanguageCredential[]>(`/applicants/${applicantId}/languages/`),
  
  create: (applicantId: number, data: LanguageCredentialCreate) =>
    api.post<LanguageCredential>(`/applicants/${applicantId}/languages/`, data),
  
  update: (applicantId: number, id: number, data: Partial<LanguageCredentialCreate>) =>
    api.patch<LanguageCredential>(`/applicants/${applicantId}/languages/${id}`, data),
  
  delete: (applicantId: number, id: number) =>
    api.delete(`/applicants/${applicantId}/languages/${id}`),
  
  search: (params?: { test_type?: string; language?: string }) => {
    const query = new URLSearchParams();
    if (params?.test_type) query.set('test_type', params.test_type);
    if (params?.language) query.set('language', params.language);
    const qs = query.toString();
    return api.get<LanguageCredential[]>(`/languages/${qs ? `?${qs}` : ''}`);
  },
};

// Documents
export const documentsApi = {
  list: (applicantId: number) =>
    api.get<Document[]>(`/applicants/${applicantId}/documents/`),
  
  upload: (applicantId: number, file: File, metadata: {
    document_type: string;
    title: string;
    description?: string;
    is_public?: boolean;
    used_for_university?: string;
    used_for_program?: string;
  }) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', metadata.document_type);
    formData.append('title', metadata.title);
    if (metadata.description) formData.append('description', metadata.description);
    if (metadata.is_public !== undefined) formData.append('is_public', String(metadata.is_public));
    if (metadata.used_for_university) formData.append('used_for_university', metadata.used_for_university);
    if (metadata.used_for_program) formData.append('used_for_program', metadata.used_for_program);
    return api.upload<Document>(`/applicants/${applicantId}/documents/`, formData);
  },
  
  delete: (applicantId: number, id: number) =>
    api.delete(`/applicants/${applicantId}/documents/${id}`),
  
  getDownloadUrl: (applicantId: number, id: number) =>
    `/api/v1/applicants/${applicantId}/documents/${id}/download`,
  
  search: (params?: { document_type?: string; university?: string }) => {
    const query = new URLSearchParams();
    if (params?.document_type) query.set('document_type', params.document_type);
    if (params?.university) query.set('university', params.university);
    const qs = query.toString();
    return api.get<Document[]>(`/documents/${qs ? `?${qs}` : ''}`);
  },
};

// Activities
export const activitiesApi = {
  list: (applicantId: number, activityType?: string) => {
    const query = activityType ? `?activity_type=${activityType}` : '';
    return api.get<ExtracurricularActivity[]>(`/applicants/${applicantId}/activities/${query}`);
  },
  
  create: (applicantId: number, data: ExtracurricularActivityCreate) =>
    api.post<ExtracurricularActivity>(`/applicants/${applicantId}/activities/`, data),
  
  update: (applicantId: number, id: number, data: Partial<ExtracurricularActivityCreate>) =>
    api.patch<ExtracurricularActivity>(`/applicants/${applicantId}/activities/${id}`, data),
  
  delete: (applicantId: number, id: number) =>
    api.delete(`/applicants/${applicantId}/activities/${id}`),
  
  search: (params?: { activity_type?: string; organization?: string }) => {
    const query = new URLSearchParams();
    if (params?.activity_type) query.set('activity_type', params.activity_type);
    if (params?.organization) query.set('organization', params.organization);
    const qs = query.toString();
    return api.get<ExtracurricularActivity[]>(`/activities/${qs ? `?${qs}` : ''}`);
  },
};

// Applications
export const applicationsApi = {
  list: (applicantId: number, params?: { status?: string; year?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.year) query.set('year', String(params.year));
    const qs = query.toString();
    return api.get<Application[]>(`/applicants/${applicantId}/applications/${qs ? `?${qs}` : ''}`);
  },
  
  create: (applicantId: number, data: ApplicationCreate) =>
    api.post<Application>(`/applicants/${applicantId}/applications/`, data),
  
  update: (applicantId: number, id: number, data: Partial<ApplicationCreate>) =>
    api.patch<Application>(`/applicants/${applicantId}/applications/${id}`, data),
  
  delete: (applicantId: number, id: number) =>
    api.delete(`/applicants/${applicantId}/applications/${id}`),
  
  search: (params?: {
    university?: string;
    country?: string;
    program?: string;
    status?: string;
    degree_level?: string;
    year?: number;
    scholarship_received?: boolean;
  }) => {
    const query = new URLSearchParams();
    if (params?.university) query.set('university', params.university);
    if (params?.country) query.set('country', params.country);
    if (params?.program) query.set('program', params.program);
    if (params?.status) query.set('status', params.status);
    if (params?.degree_level) query.set('degree_level', params.degree_level);
    if (params?.year) query.set('year', String(params.year));
    if (params?.scholarship_received !== undefined) 
      query.set('scholarship_received', String(params.scholarship_received));
    const qs = query.toString();
    return api.get<Application[]>(`/applications/${qs ? `?${qs}` : ''}`);
  },
  
  statsByUniversity: (year?: number) => {
    const query = year ? `?year=${year}` : '';
    return api.get<UniversityStat[]>(`/applications/stats/by-university${query}`);
  },
  
  statsByCountry: (year?: number) => {
    const query = year ? `?year=${year}` : '';
    return api.get<CountryStat[]>(`/applications/stats/by-country${query}`);
  },
};

// Universities
export const universitiesApi = {
  list: (params?: { name?: string; country?: string; city?: string; skip?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.name) query.set('name', params.name);
    if (params?.country) query.set('country', params.country);
    if (params?.city) query.set('city', params.city);
    if (params?.skip) query.set('skip', String(params.skip));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return api.get<University[]>(`/universities/${qs ? `?${qs}` : ''}`);
  },

  get: (id: number) => api.get<University>(`/universities/${id}`),

  getWithCourses: (id: number) => api.get<UniversityWithCourses>(`/universities/${id}/with-courses`),

  create: (data: UniversityCreate) => api.post<University>('/universities/', data),

  update: (id: number, data: Partial<UniversityCreate>) =>
    api.patch<University>(`/universities/${id}`, data),

  delete: (id: number) => api.delete(`/universities/${id}`),
};

// Courses
export const coursesApi = {
  list: (params?: {
    university_id?: number;
    degree_level?: string;
    country?: string;
    course_name?: string;
    skip?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.university_id) query.set('university_id', String(params.university_id));
    if (params?.degree_level) query.set('degree_level', params.degree_level);
    if (params?.country) query.set('country', params.country);
    if (params?.course_name) query.set('course_name', params.course_name);
    if (params?.skip) query.set('skip', String(params.skip));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return api.get<CourseWithUniversity[]>(`/courses/${qs ? `?${qs}` : ''}`);
  },

  get: (id: number) => api.get<CourseWithUniversity>(`/courses/${id}`),

  checkAccess: () => api.get<CourseAccessStatus>('/courses/check-access'),

  create: (data: CourseCreate) => api.post<Course>('/courses/', data),

  update: (id: number, data: Partial<CourseCreate>) =>
    api.patch<Course>(`/courses/${id}`, data),

  delete: (id: number) => api.delete(`/courses/${id}`),
};
