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

// Paginated courses response
export interface CoursesResponse {
  courses: Course[];
  total: number;
  limit: number;
  offset: number;
}

// Course search parameters
export interface CourseSearchParams {
  query?: string;
  field?: string;
  fields?: string[];
  country?: string;
  countries?: string[];
  degree_level?: DegreeLevel | '';
  tuition_free_only?: boolean;
  limit?: number;
  offset?: number;
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

export const NOTE_CATEGORIES: Record<NoteCategory, { labelKey: string; icon: string; color: string }> = {
  important: { labelKey: 'notes.categories.important', icon: '⚡', color: 'bg-status-danger/10 text-status-danger border border-status-danger/30' },
  contact: { labelKey: 'notes.categories.contact', icon: '👤', color: 'bg-status-info/10 text-status-info border border-status-info/30' },
  link: { labelKey: 'notes.categories.link', icon: '🔗', color: 'bg-brand-secondary/10 text-brand-secondary border border-brand-secondary/30' },
  reminder: { labelKey: 'notes.categories.reminder', icon: '⏰', color: 'bg-status-warning/10 text-status-warning border border-status-warning/30' },
  general: { labelKey: 'notes.categories.general', icon: '📝', color: 'bg-elevated text-text-secondary border border-border' },
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
  researching: 'status.researching',
  preparing: 'status.preparing',
  submitted: 'status.submitted',
  under_review: 'status.underReview',
  interview: 'status.interview',
  waitlisted: 'status.waitlisted',
  accepted: 'status.accepted',
  rejected: 'status.rejected',
  withdrawn: 'status.withdrawn',
  deferred: 'status.deferred',
};

export const STATUS_COLORS: Record<ApplicationStatus, string> = {
  researching: 'bg-elevated text-text-secondary border border-border',
  preparing: 'bg-status-info/10 text-status-info border border-status-info/30',
  submitted: 'bg-brand-secondary/10 text-brand-secondary border border-brand-secondary/30',
  under_review: 'bg-status-warning/10 text-status-warning border border-status-warning/30',
  interview: 'bg-status-warning/10 text-status-warning border border-status-warning/30',
  waitlisted: 'bg-status-warning/10 text-status-warning border border-status-warning/30',
  accepted: 'bg-status-success/10 text-status-success border border-status-success/30',
  rejected: 'bg-status-danger/10 text-status-danger border border-status-danger/30',
  withdrawn: 'bg-elevated text-text-muted border border-border',
  deferred: 'bg-brand-primary/10 text-brand-primary border border-brand-primary/30',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  dream: 'priority.dream',
  target: 'priority.target',
  safety: 'priority.safety',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  dream: 'bg-gradient-to-r from-brand-secondary to-brand-primary text-white',
  target: 'bg-gradient-to-r from-brand-primary to-status-info text-white',
  safety: 'bg-gradient-to-r from-status-success to-brand-accent text-white',
};

// Match score color helper
export const getMatchScoreColor = (score: number): string => {
  if (score >= 80) return 'text-status-success bg-status-success/10';
  if (score >= 60) return 'text-status-info bg-status-info/10';
  if (score >= 40) return 'text-status-warning bg-status-warning/10';
  return 'text-text-secondary bg-elevated';
};