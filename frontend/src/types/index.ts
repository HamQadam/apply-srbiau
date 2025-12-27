// Enums
export type DocumentType = 
  | 'cv'
  | 'statement_of_purpose'
  | 'motivation_letter'
  | 'recommendation_letter'
  | 'transcript'
  | 'certificate'
  | 'portfolio'
  | 'other';

export type ActivityType =
  | 'work_experience'
  | 'research'
  | 'teaching_assistant'
  | 'volunteer'
  | 'community_leadership'
  | 'publication'
  | 'award'
  | 'project'
  | 'other';

export type ApplicationStatus =
  | 'preparing'
  | 'submitted'
  | 'under_review'
  | 'interview'
  | 'accepted'
  | 'rejected'
  | 'waitlisted'
  | 'withdrawn';

export type DegreeLevel = 'masters' | 'phd' | 'mba' | 'postdoc';

// Applicant
export interface Applicant {
  id: number;
  display_name: string;
  is_anonymous: boolean;
  university: string;
  faculty: string | null;
  major: string;
  degree_level: string;
  graduation_year: number;
  overall_gpa: string | null;
  last_two_years_gpa: string | null;
  gpa_scale: string | null;
  bio: string | null;
  created_at: string;
}

export interface ApplicantCreate {
  display_name: string;
  is_anonymous?: boolean;
  email?: string;
  university: string;
  faculty?: string;
  major: string;
  degree_level: string;
  graduation_year: number;
  overall_gpa?: string;
  last_two_years_gpa?: string;
  gpa_scale?: string;
  bio?: string;
}

export interface ApplicantFull extends Applicant {
  language_credentials: LanguageCredential[];
  documents: Document[];
  activities: ExtracurricularActivity[];
  applications: Application[];
}

// Language Credential
export interface LanguageCredential {
  id: number;
  applicant_id: number;
  language: string;
  test_type: string;
  overall_score: string;
  reading_score: string | null;
  writing_score: string | null;
  speaking_score: string | null;
  listening_score: string | null;
  test_date: string | null;
  valid_until: string | null;
  notes: string | null;
  created_at: string;
}

export interface LanguageCredentialCreate {
  language: string;
  test_type: string;
  overall_score: string;
  reading_score?: string;
  writing_score?: string;
  speaking_score?: string;
  listening_score?: string;
  test_date?: string;
  valid_until?: string;
  notes?: string;
}

// Document
export interface Document {
  id: number;
  applicant_id: number;
  document_type: DocumentType;
  title: string;
  description: string | null;
  is_public: boolean;
  used_for_university: string | null;
  used_for_program: string | null;
  file_name: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
}

export interface DocumentCreate {
  document_type: DocumentType;
  title: string;
  description?: string;
  is_public?: boolean;
  used_for_university?: string;
  used_for_program?: string;
}

// Extracurricular Activity
export interface ExtracurricularActivity {
  id: number;
  applicant_id: number;
  activity_type: ActivityType;
  title: string;
  organization: string;
  location: string | null;
  description: string;
  start_date: string | null;
  end_date: string | null;
  is_ongoing: boolean;
  url: string | null;
  impact_note: string | null;
  created_at: string;
}

export interface ExtracurricularActivityCreate {
  activity_type: ActivityType;
  title: string;
  organization: string;
  location?: string;
  description: string;
  start_date?: string;
  end_date?: string;
  is_ongoing?: boolean;
  url?: string;
  impact_note?: string;
}

// Application
export interface Application {
  id: number;
  applicant_id: number;
  university_id?: number;  // NEW - optional for backward compatibility
  university_name: string;
  country: string;
  city: string | null;
  program_name: string;
  department: string | null;
  degree_level: DegreeLevel;
  application_year: number;
  application_round: string | null;
  application_deadline: string | null;
  submitted_date: string | null;
  status: ApplicationStatus;
  decision_date: string | null;
  scholarship_applied: boolean;
  scholarship_received: boolean;
  scholarship_name: string | null;
  scholarship_amount: string | null;
  notes: string | null;
  interview_experience: string | null;
  how_found: string | null;
  would_recommend: boolean | null;
  created_at: string;
}

export interface ApplicationCreate {
  university_id?: number;  // NEW - can use this OR university_name
  university_name?: string;  // Make optional
  country?: string;  // Make optional
  city?: string;
  program_name: string;
  department?: string;
  degree_level: DegreeLevel;
  application_year: number;
  application_round?: string;
  application_deadline?: string;
  submitted_date?: string;
  status?: ApplicationStatus;
  decision_date?: string;
  scholarship_applied?: boolean;
  scholarship_received?: boolean;
  scholarship_name?: string;
  scholarship_amount?: string;
  notes?: string;
  interview_experience?: string;
  how_found?: string;
  would_recommend?: boolean;
}

// Stats
export interface UniversityStat {
  university: string;
  country: string;
  total_applications: number;
  accepted: number;
  rejected: number;
  acceptance_rate: number;
}

export interface CountryStat {
  country: string;
  total_applications: number;
  accepted: number;
  with_scholarship: number;
}

// University
export interface University {
  id: number;
  name: string;
  country: string;
  city: string | null;
  website: string | null;
  logo_url: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface UniversityCreate {
  name: string;
  country: string;
  city?: string;
  website?: string;
  logo_url?: string;
  description?: string;
}

export interface UniversityWithCourses extends University {
  courses: Course[];
}

// Course
export interface Course {
  id: number;
  university_id: number;
  course_name: string;
  department: string | null;
  degree_level: DegreeLevel;
  website_url: string | null;
  description: string | null;
  language_requirements: string | null;
  minimum_gpa: string | null;
  application_deadline: string | null;
  tuition_fees: string | null;
  duration_months: number | null;
  scholarships_available: boolean;
  notes: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface CourseCreate {
  university_id: number;
  course_name: string;
  department?: string;
  degree_level: DegreeLevel;
  website_url?: string;
  description?: string;
  language_requirements?: string;
  minimum_gpa?: string;
  application_deadline?: string;
  tuition_fees?: string;
  duration_months?: number;
  scholarships_available?: boolean;
  notes?: string;
}

export interface CourseWithUniversity extends Course {
  university: University;
}

export interface CourseAccessStatus {
  can_view: boolean;
  remaining_views: number | string;
  is_authenticated: boolean;
}
