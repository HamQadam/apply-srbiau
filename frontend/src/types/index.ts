// User & Auth
export interface User {
  id: number;
  phone: string;
  display_name: string | null;
  email: string | null;
  origin_country: string | null;
  origin_university: string | null;
  field_of_study: string | null;
  graduation_year: number | null;
  goal: UserGoal | null;
  onboarding_step: OnboardingStep;
  onboarding_completed: boolean;
  ghadam_balance: number;
  matching_profile: MatchingProfile | null;
  matching_profile_completed: boolean;
  created_at: string;
}

export type UserGoal = 'applying' | 'applied' | 'browsing';
export type OnboardingStep = 'signed_up' | 'goal_selected' | 'first_program_added' | 'profile_started' | 'profile_completed' | 'completed';

// Matching Profile
export interface MatchingProfile {
  preferred_fields: string[];
  preferred_countries: string[];
  budget_min?: number;
  budget_max?: number;
  preferred_degree_level?: string;
  target_intake?: string;
  language_preference?: string;
  gre_score?: number;
  gmat_score?: number;
  gpa?: number;
  gpa_scale?: string;
  prefer_scholarships?: boolean;
}

export interface MatchingOptions {
  fields: string[];
  countries: string[];
  budget_ranges: Record<string, { min: number; max: number; label: string }>;
  intake_options: { value: string; label: string }[];
  degree_levels: string[];
  teaching_languages: string[];
}

export interface Recommendation {
  id: number;
  program_name: string;
  university_name: string | null;
  country: string | null;
  city: string | null;
  degree_level: string | null;
  field_of_study: string | null;
  tuition_fee: number | null;
  teaching_language: string | null;
  duration_months: number | null;
  application_deadline: string | null;
  university_ranking_qs: number | null;
  scholarship_available: boolean;
  match_score: number;
  match_reasons: string[];
  warnings: string[];
}

export interface RecommendationsResponse {
  recommendations: Recommendation[];
  total: number;
  limit: number;
  offset: number;
  profile_summary: {
    fields: string[];
    countries: string[];
    degree_level: string | null;
    budget_max: number | null;
  };
}

export interface AuthResponse {
  token: string;
  user: User;
  is_new_user: boolean;
}

// University & Course
export interface University {
  id: number;
  name: string;
  name_local: string | null;
  country: string;
  city: string;
  website: string | null;
  logo_url: string | null;
  ranking_qs: number | null;
  ranking_the: number | null;
  ranking_shanghai: number | null;
  university_type: string | null;
  course_count?: number;
}

export interface Course {
  id: number;
  university_id: number;
  name: string;
  degree_level: DegreeLevel;
  field: string;
  teaching_language: TeachingLanguage;
  duration_months: number | null;
  tuition_fee_amount: number | null;
  tuition_fee_currency: Currency | null;
  is_tuition_free: boolean;
  deadline_fall: string | null;
  deadline_spring: string | null;
  gpa_minimum: number | null;
  gre_required: boolean;
  scholarships_available: boolean;
  program_url: string | null;
  university_name?: string;
  university_country?: string;
  university_city?: string;
  university_ranking_qs?: number | null;
}

export interface CourseSummary {
  id: number;
  name: string;
  degree_level: DegreeLevel;
  university_name: string;
  university_country: string;
  deadline_fall: string | null;
}

export type DegreeLevel = 'bachelor' | 'master' | 'phd' | 'diploma' | 'certificate';
export type TeachingLanguage = 'english' | 'german' | 'french' | 'dutch' | 'spanish' | 'italian' | 'other';
export type Currency = 'EUR' | 'USD' | 'CAD' | 'AUD' | 'GBP' | 'CHF';

// Tracked Program
export interface TrackedProgram {
  id: number;
  user_id: number;
  course_id: number | null;
  custom_program_name: string | null;
  custom_university_name: string | null;
  custom_country: string | null;
  custom_deadline: string | null;
  status: ApplicationStatus;
  priority: Priority;
  intake: IntakePeriod | null;
  deadline: string | null;
  submitted_date: string | null;
  result_date: string | null;
  // Sharing state (experience platform)
  shared_as_experience?: boolean;
  shared_experience_id?: number | null;
  shared_at?: string | null;
  notes: string | null;
  notes_entries: NoteEntry[] | null;
  document_checklist: ChecklistItem[] | null;
  application_portal_url: string | null;
  application_id: string | null;
  scholarship_offered: boolean;
  scholarship_amount: number | null;
  match_score: number | null;
  created_at: string;
  updated_at: string;
  // Joined data
  program_name?: string;
  university_name?: string;
  country?: string;
  city?: string;
  university_ranking_qs?: number | null;
  degree_level?: string;
  program_deadline?: string | null;
  
}

export interface ChecklistItem {
  id: string;
  name: string;
  required: boolean;
  completed: boolean;
  notes?: string;
  due_date?: string;
}

export type NoteCategory = 'important' | 'contact' | 'link' | 'reminder' | 'general';

export interface NoteEntry {
  id: string;
  content: string;
  category: NoteCategory;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export const NOTE_CATEGORIES: Record<NoteCategory, { label: string; icon: string; color: string }> = {
  important: { label: 'Important', icon: '⚡', color: 'bg-red-100 text-red-700 border-red-200' },
  contact: { label: 'Contact', icon: '👤', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  link: { label: 'Link', icon: '🔗', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  reminder: { label: 'Reminder', icon: '⏰', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  general: { label: 'General', icon: '📝', color: 'bg-gray-100 text-gray-700 border-gray-200' },
};

export type ApplicationStatus = 
  | 'researching' 
  | 'preparing' 
  | 'submitted' 
  | 'under_review' 
  | 'interview' 
  | 'waitlisted' 
  | 'accepted' 
  | 'rejected' 
  | 'withdrawn'
  | 'deferred';

export type Priority = 'dream' | 'target' | 'safety';
export type IntakePeriod = 'fall_2025' | 'spring_2026' | 'fall_2026' | 'spring_2027' | 'fall_2027';

export interface TrackerStats {
  total_programs: number;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
  accepted_count: number;
  rejected_count: number;
  pending_count: number;
  upcoming_deadlines: number;
}

export interface DeadlineItem {
  id: number;
  program_name: string;
  university_name: string;
  deadline: string;
  days_until: number;
  status: ApplicationStatus;
}

// Ghadam
export interface GhadamTransaction {
  id: number;
  transaction_type: string;
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

// API
export interface CreateTrackedProgramRequest {
  course_id?: number;
  custom_program_name?: string;
  custom_university_name?: string;
  custom_country?: string;
  custom_deadline?: string;
  priority?: Priority;
  intake?: IntakePeriod;
  notes?: string;
}

export interface UpdateTrackedProgramRequest {
  status?: ApplicationStatus;
  priority?: Priority;
  intake?: IntakePeriod;
  deadline?: string;
  submitted_date?: string;
  result_date?: string;
  notes?: string;
  document_checklist?: ChecklistItem[];
  application_portal_url?: string;
  application_id?: string;
  scholarship_offered?: boolean;
  scholarship_amount?: number;
  shared_as_experience?: boolean;
  shared_experience_id?: number | null;
  shared_at?: string | null;
}

// Display helpers
export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  researching: 'Researching',
  preparing: 'Preparing',
  submitted: 'Submitted',
  under_review: 'Under Review',
  interview: 'Interview',
  waitlisted: 'Waitlisted',
  accepted: 'Accepted',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  deferred: 'Deferred',
};

export const STATUS_COLORS: Record<ApplicationStatus, string> = {
  researching: 'bg-slate-100 text-slate-700 border border-slate-200',
  preparing: 'bg-blue-100 text-blue-700 border border-blue-200',
  submitted: 'bg-violet-100 text-violet-700 border border-violet-200',
  under_review: 'bg-amber-100 text-amber-700 border border-amber-200',
  interview: 'bg-orange-100 text-orange-700 border border-orange-200',
  waitlisted: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  accepted: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  rejected: 'bg-red-100 text-red-700 border border-red-200',
  withdrawn: 'bg-gray-100 text-gray-500 border border-gray-200',
  deferred: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  dream: 'Dream',
  target: 'Target',
  safety: 'Safety',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  dream: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
  target: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white',
  safety: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
};

// Match score color helper
export const getMatchScoreColor = (score: number): string => {
  if (score >= 80) return 'text-emerald-600 bg-emerald-50';
  if (score >= 60) return 'text-blue-600 bg-blue-50';
  if (score >= 40) return 'text-amber-600 bg-amber-50';
  return 'text-gray-600 bg-gray-50';
};
