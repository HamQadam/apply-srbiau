import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { applicantsApi, languagesApi, activitiesApi, applicationsApi } from '../api';
import { 
  Card, 
  CardContent, 
  CardHeader,
  Button, 
  Input, 
  Select, 
  Textarea,
} from '../components/ui';
import type { 
  ApplicantCreate, 
  LanguageCredentialCreate, 
  ExtracurricularActivityCreate,
  ApplicationCreate,
} from '../types';

const DEGREE_LEVELS = [
  { value: '', label: 'Select degree level' },
  { value: "Bachelor's", label: "Bachelor's" },
  { value: "Master's", label: "Master's" },
  { value: 'PhD', label: 'PhD' },
];

const LANGUAGE_TESTS = [
  { value: '', label: 'Select test type' },
  { value: 'IELTS', label: 'IELTS' },
  { value: 'TOEFL', label: 'TOEFL iBT' },
  { value: 'DELF/DALF', label: 'DELF/DALF' },
  { value: 'TestDaF', label: 'TestDaF' },
  { value: 'Other', label: 'Other' },
];

const ACTIVITY_TYPES = [
  { value: '', label: 'Select type' },
  { value: 'work_experience', label: 'Work Experience' },
  { value: 'research', label: 'Research' },
  { value: 'teaching_assistant', label: 'Teaching Assistant' },
  { value: 'volunteer', label: 'Volunteer' },
  { value: 'publication', label: 'Publication' },
  { value: 'award', label: 'Award' },
  { value: 'project', label: 'Project' },
  { value: 'other', label: 'Other' },
];

const APPLICATION_STATUSES = [
  { value: 'preparing', label: 'Preparing' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'interview', label: 'Interview' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'waitlisted', label: 'Waitlisted' },
];

export function NewApplicantPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [applicantId, setApplicantId] = useState<number | null>(null);
  
  const [profile, setProfile] = useState<ApplicantCreate>({
    display_name: '',
    is_anonymous: false,
    university: '',
    faculty: '',
    major: '',
    degree_level: '',
    graduation_year: new Date().getFullYear(),
    overall_gpa: '',
    last_two_years_gpa: '',
    gpa_scale: '4.0',
    bio: '',
  });

  const [languages, setLanguages] = useState<LanguageCredentialCreate[]>([]);
  const [activities, setActivities] = useState<ExtracurricularActivityCreate[]>([]);
  const [applications, setApplications] = useState<ApplicationCreate[]>([]);

  const createApplicant = useMutation({
    mutationFn: applicantsApi.create,
    onSuccess: (data) => {
      setApplicantId(data.id);
      setStep(2);
    },
  });

  const addLanguage = useMutation({
    mutationFn: (data: LanguageCredentialCreate) => 
      languagesApi.create(applicantId!, data),
  });

  const addActivity = useMutation({
    mutationFn: (data: ExtracurricularActivityCreate) => 
      activitiesApi.create(applicantId!, data),
  });

  const addApplication = useMutation({
    mutationFn: (data: ApplicationCreate) => 
      applicationsApi.create(applicantId!, data),
  });

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    createApplicant.mutate(profile);
  };

  const handleFinish = async () => {
    // Save all additional data
    for (const lang of languages) {
      if (lang.test_type && lang.overall_score) {
        await addLanguage.mutateAsync(lang);
      }
    }
    for (const activity of activities) {
      if (activity.title && activity.organization) {
        await addActivity.mutateAsync(activity);
      }
    }
    for (const app of applications) {
      if (app.university_name && app.program_name) {
        await addApplication.mutateAsync(app);
      }
    }
    navigate(`/applicants/${applicantId}`);
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                s < step
                  ? 'bg-green-500 text-white'
                  : s === step
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {s < step ? <Check className="w-5 h-5" /> : s}
            </div>
            {s < 4 && (
              <div className={`w-12 h-1 ${s < step ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Profile */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <h1 className="text-xl font-bold">Your Profile</h1>
            <p className="text-sm text-gray-600">Tell us about your academic background</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitProfile} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="Display Name"
                  placeholder="Your name or alias"
                  value={profile.display_name}
                  onChange={(e) => setProfile(p => ({ ...p, display_name: e.target.value }))}
                  required
                />
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profile.is_anonymous}
                      onChange={(e) => setProfile(p => ({ ...p, is_anonymous: e.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Stay anonymous</span>
                  </label>
                </div>
              </div>

              <Input
                label="University"
                placeholder="e.g., Science and Research Branch, IAU"
                value={profile.university}
                onChange={(e) => setProfile(p => ({ ...p, university: e.target.value }))}
                required
              />

              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="Faculty"
                  placeholder="e.g., Engineering"
                  value={profile.faculty || ''}
                  onChange={(e) => setProfile(p => ({ ...p, faculty: e.target.value }))}
                />
                <Input
                  label="Major / Course"
                  placeholder="e.g., Computer Science"
                  value={profile.major}
                  onChange={(e) => setProfile(p => ({ ...p, major: e.target.value }))}
                  required
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Select
                  label="Degree Level"
                  options={DEGREE_LEVELS}
                  value={profile.degree_level}
                  onChange={(e) => setProfile(p => ({ ...p, degree_level: e.target.value }))}
                  required
                />
                <Input
                  label="Graduation Year"
                  type="number"
                  min={1990}
                  max={2100}
                  value={profile.graduation_year}
                  onChange={(e) => setProfile(p => ({ ...p, graduation_year: Number(e.target.value) }))}
                  required
                />
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <Input
                  label="Overall GPA"
                  placeholder="e.g., 3.8"
                  value={profile.overall_gpa || ''}
                  onChange={(e) => setProfile(p => ({ ...p, overall_gpa: e.target.value }))}
                />
                <Input
                  label="Last 2 Years GPA"
                  placeholder="e.g., 3.9"
                  value={profile.last_two_years_gpa || ''}
                  onChange={(e) => setProfile(p => ({ ...p, last_two_years_gpa: e.target.value }))}
                />
                <Input
                  label="GPA Scale"
                  placeholder="e.g., 4.0 or 20"
                  value={profile.gpa_scale || ''}
                  onChange={(e) => setProfile(p => ({ ...p, gpa_scale: e.target.value }))}
                />
              </div>

              <Textarea
                label="Bio (optional)"
                placeholder="Tell others about yourself and your journey..."
                value={profile.bio || ''}
                onChange={(e) => setProfile(p => ({ ...p, bio: e.target.value }))}
              />

              <div className="flex justify-end pt-4">
                <Button type="submit" loading={createApplicant.isPending}>
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Language Credentials */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <h1 className="text-xl font-bold">Language Credentials</h1>
            <p className="text-sm text-gray-600">Share your test scores (optional)</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {languages.map((lang, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-lg space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Test #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => setLanguages(l => l.filter((_, i) => i !== idx))}
                      className="text-red-600 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <Select
                      label="Test Type"
                      options={LANGUAGE_TESTS}
                      value={lang.test_type}
                      onChange={(e) => {
                        const newLangs = [...languages];
                        newLangs[idx].test_type = e.target.value;
                        setLanguages(newLangs);
                      }}
                    />
                    <Input
                      label="Language"
                      placeholder="e.g., English"
                      value={lang.language}
                      onChange={(e) => {
                        const newLangs = [...languages];
                        newLangs[idx].language = e.target.value;
                        setLanguages(newLangs);
                      }}
                    />
                    <Input
                      label="Overall Score"
                      placeholder="e.g., 7.5"
                      value={lang.overall_score}
                      onChange={(e) => {
                        const newLangs = [...languages];
                        newLangs[idx].overall_score = e.target.value;
                        setLanguages(newLangs);
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <Input
                      label="Reading"
                      placeholder="R"
                      value={lang.reading_score || ''}
                      onChange={(e) => {
                        const newLangs = [...languages];
                        newLangs[idx].reading_score = e.target.value;
                        setLanguages(newLangs);
                      }}
                    />
                    <Input
                      label="Listening"
                      placeholder="L"
                      value={lang.listening_score || ''}
                      onChange={(e) => {
                        const newLangs = [...languages];
                        newLangs[idx].listening_score = e.target.value;
                        setLanguages(newLangs);
                      }}
                    />
                    <Input
                      label="Speaking"
                      placeholder="S"
                      value={lang.speaking_score || ''}
                      onChange={(e) => {
                        const newLangs = [...languages];
                        newLangs[idx].speaking_score = e.target.value;
                        setLanguages(newLangs);
                      }}
                    />
                    <Input
                      label="Writing"
                      placeholder="W"
                      value={lang.writing_score || ''}
                      onChange={(e) => {
                        const newLangs = [...languages];
                        newLangs[idx].writing_score = e.target.value;
                        setLanguages(newLangs);
                      }}
                    />
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="secondary"
                onClick={() => setLanguages(l => [...l, { 
                  language: 'English', 
                  test_type: '', 
                  overall_score: '' 
                }])}
              >
                + Add Language Test
              </Button>
            </div>

            <div className="flex justify-between pt-6">
              <Button variant="ghost" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button onClick={() => setStep(3)}>
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Activities */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <h1 className="text-xl font-bold">Activities & Experience</h1>
            <p className="text-sm text-gray-600">Share work, research, volunteering (optional)</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {activities.map((act, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-lg space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Activity #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => setActivities(a => a.filter((_, i) => i !== idx))}
                      className="text-red-600 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Select
                      label="Type"
                      options={ACTIVITY_TYPES}
                      value={act.activity_type}
                      onChange={(e) => {
                        const newActs = [...activities];
                        newActs[idx].activity_type = e.target.value as any;
                        setActivities(newActs);
                      }}
                    />
                    <Input
                      label="Title/Role"
                      placeholder="e.g., Software Engineer"
                      value={act.title}
                      onChange={(e) => {
                        const newActs = [...activities];
                        newActs[idx].title = e.target.value;
                        setActivities(newActs);
                      }}
                    />
                  </div>
                  <Input
                    label="Organization"
                    placeholder="e.g., Google, MIT"
                    value={act.organization}
                    onChange={(e) => {
                      const newActs = [...activities];
                      newActs[idx].organization = e.target.value;
                      setActivities(newActs);
                    }}
                  />
                  <Textarea
                    label="Description"
                    placeholder="What did you do? Any achievements?"
                    value={act.description}
                    onChange={(e) => {
                      const newActs = [...activities];
                      newActs[idx].description = e.target.value;
                      setActivities(newActs);
                    }}
                  />
                </div>
              ))}

              <Button
                type="button"
                variant="secondary"
                onClick={() => setActivities(a => [...a, { 
                  activity_type: '' as any,
                  title: '',
                  organization: '',
                  description: '',
                }])}
              >
                + Add Activity
              </Button>
            </div>

            <div className="flex justify-between pt-6">
              <Button variant="ghost" onClick={() => setStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button onClick={() => setStep(4)}>
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Applications */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <h1 className="text-xl font-bold">Your Applications</h1>
            <p className="text-sm text-gray-600">Share programs you applied to - this helps others the most!</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {applications.map((app, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-lg space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Application #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => setApplications(a => a.filter((_, i) => i !== idx))}
                      className="text-red-600 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Input
                      label="University"
                      placeholder="e.g., Sorbonne University"
                      value={app.university_name}
                      onChange={(e) => {
                        const newApps = [...applications];
                        newApps[idx].university_name = e.target.value;
                        setApplications(newApps);
                      }}
                    />
                    <Input
                      label="Country"
                      placeholder="e.g., France"
                      value={app.country}
                      onChange={(e) => {
                        const newApps = [...applications];
                        newApps[idx].country = e.target.value;
                        setApplications(newApps);
                      }}
                    />
                  </div>
                  <Input
                    label="Program Name"
                    placeholder="e.g., MSc Computer Science"
                    value={app.program_name}
                    onChange={(e) => {
                      const newApps = [...applications];
                      newApps[idx].program_name = e.target.value;
                      setApplications(newApps);
                    }}
                  />
                  <div className="grid sm:grid-cols-3 gap-4">
                    <Select
                      label="Degree"
                      options={[
                        { value: 'masters', label: "Master's" },
                        { value: 'phd', label: 'PhD' },
                        { value: 'mba', label: 'MBA' },
                        { value: 'postdoc', label: 'PostDoc' },
                      ]}
                      value={app.degree_level}
                      onChange={(e) => {
                        const newApps = [...applications];
                        newApps[idx].degree_level = e.target.value as any;
                        setApplications(newApps);
                      }}
                    />
                    <Input
                      label="Year"
                      type="number"
                      value={app.application_year}
                      onChange={(e) => {
                        const newApps = [...applications];
                        newApps[idx].application_year = Number(e.target.value);
                        setApplications(newApps);
                      }}
                    />
                    <Select
                      label="Status"
                      options={APPLICATION_STATUSES}
                      value={app.status || 'preparing'}
                      onChange={(e) => {
                        const newApps = [...applications];
                        newApps[idx].status = e.target.value as any;
                        setApplications(newApps);
                      }}
                    />
                  </div>
                  <Textarea
                    label="Tips & Notes"
                    placeholder="Share tips, timeline, or any helpful info for future applicants..."
                    value={app.notes || ''}
                    onChange={(e) => {
                      const newApps = [...applications];
                      newApps[idx].notes = e.target.value;
                      setApplications(newApps);
                    }}
                  />
                </div>
              ))}

              <Button
                type="button"
                variant="secondary"
                onClick={() => setApplications(a => [...a, { 
                  university_name: '',
                  country: '',
                  program_name: '',
                  degree_level: 'masters',
                  application_year: new Date().getFullYear(),
                  status: 'preparing',
                }])}
              >
                + Add Application
              </Button>
            </div>

            <div className="flex justify-between pt-6">
              <Button variant="ghost" onClick={() => setStep(3)}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button onClick={handleFinish} loading={addApplication.isPending}>
                Complete <Check className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
