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
  created_at: string;
}

export type UserGoal = 'applying' | 'applied' | 'browsing';
export type OnboardingStep = 'signed_up' | 'goal_selected' | 'first_program_added' | 'profile_started' | 'completed';

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
  notes: string | null;
  document_checklist: ChecklistItem[] | null;
  application_portal_url: string | null;
  application_id: string | null;
  scholarship_offered: boolean;
  scholarship_amount: number | null;
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
  name: string;
  required: boolean;
  completed: boolean;
  notes?: string;
}

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
  researching: 'bg-gray-100 text-gray-700',
  preparing: 'bg-blue-100 text-blue-700',
  submitted: 'bg-purple-100 text-purple-700',
  under_review: 'bg-yellow-100 text-yellow-700',
  interview: 'bg-orange-100 text-orange-700',
  waitlisted: 'bg-amber-100 text-amber-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  withdrawn: 'bg-gray-200 text-gray-600',
  deferred: 'bg-indigo-100 text-indigo-700',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  dream: 'Dream',
  target: 'Target',
  safety: 'Safety',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  dream: 'bg-purple-100 text-purple-700',
  target: 'bg-blue-100 text-blue-700',
  safety: 'bg-green-100 text-green-700',
};
