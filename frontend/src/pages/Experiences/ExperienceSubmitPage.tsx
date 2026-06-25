import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { experiencesApi, trackerApi, universityApi } from '../../api/services';
import { PageTransition } from '../../components/Transitions/PageTransition';
import { Skeleton } from '../../components/Feedback/Skeleton';
import type { ExperienceApplicationStatus, ExperienceDegreeLevel, ExperienceSubmission, ExperienceVisibility, TrackedProgram, University } from '../../types';

const currentYear = new Date().getFullYear();
const degreeOptions: ExperienceDegreeLevel[] = ['masters', 'phd', 'mba', 'postdoc'];
const visibilityOptions: ExperienceVisibility[] = ['anonymized', 'public', 'private'];
const outcomeOptions: ExperienceApplicationStatus[] = ['accepted', 'rejected', 'waitlisted', 'withdrawn'];
const intakeOptions = ['Fall', 'Winter', 'Spring', 'Summer'];
const importantCountries = [
  'Germany',
  'Netherlands',
  'Canada',
  'United States',
  'United Kingdom',
  'Australia',
  'Sweden',
  'Norway',
  'Denmark',
  'Finland',
  'France',
  'Italy',
  'Austria',
  'Switzerland',
  'Belgium',
  'Spain',
  'Iran',
];
const applicationYears = Array.from({ length: 21 }, (_, index) => currentYear - index);

function toMonthInput(value?: string | null) {
  return value ? value.slice(0, 7) : '';
}

function fromMonthInput(value: string) {
  return value ? `${value}-01` : null;
}

export function ExperienceSubmitPage() {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const [program, setProgram] = useState<TrackedProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [universities, setUniversities] = useState<University[]>([]);
  const [universityQuery, setUniversityQuery] = useState('');
  const [countryOptions, setCountryOptions] = useState<Array<{ country: string; count: number }>>([]);
  const [showUniversityOptions, setShowUniversityOptions] = useState(false);
  const [form, setForm] = useState<ExperienceSubmission>({
    visibility: 'anonymized',
    application_year: currentYear,
    application_round: 'Fall',
    degree_level: 'masters',
    status: 'accepted',
    scholarship_applied: false,
    scholarship_received: false,
    notes: '',
    pii_warning_accepted: false,
    would_recommend: null,
  });

  useEffect(() => {
    universityApi.getCountries()
      .then((items) => setCountryOptions(items))
      .catch((err) => console.error('Failed to load countries:', err));
  }, []);

  useEffect(() => {
    const query = universityQuery.trim();
    if (query.length < 2) {
      setUniversities([]);
      return;
    }

    const handle = window.setTimeout(() => {
      universityApi.list({ query, limit: 8 })
        .then(setUniversities)
        .catch((err) => {
          console.error('Failed to search universities:', err);
          setUniversities([]);
        });
    }, 180);

    return () => window.clearTimeout(handle);
  }, [universityQuery]);

  useEffect(() => {
    if (!programId) {
      setLoading(false);
      return;
    }
    trackerApi.getProgram(Number(programId))
      .then((data) => {
        const universityName = data.university_name || data.custom_university_name || '';
        setProgram(data);
        setUniversityQuery(universityName);
        setForm((prev) => ({
          ...prev,
          program_name: data.program_name || data.custom_program_name || '',
          university_name: universityName,
          country: data.country || data.custom_country || '',
          course_id: data.course_id || undefined,
          application_deadline: data.deadline || data.custom_deadline || data.program_deadline || null,
          submitted_date: data.submitted_date || null,
          decision_date: data.result_date || null,
          application_round: data.intake ? data.intake.split('_')[0].replace(/^./, (char) => char.toUpperCase()) : prev.application_round,
          scholarship_received: data.scholarship_offered,
          scholarship_applied: data.scholarship_offered,
          scholarship_amount: data.scholarship_amount ? String(data.scholarship_amount) : '',
        }));
      })
      .catch((err) => {
        console.error('Failed to load tracked program:', err);
        toast.error('Could not load tracked programme');
      })
      .finally(() => setLoading(false));
  }, [programId]);

  const sortedCountryOptions = useMemo(() => {
    const byCountry = new Map(countryOptions.map((item) => [item.country, item]));
    const priority = importantCountries.map((country) => byCountry.get(country) || { country, count: 0 });
    const rest = countryOptions
      .filter((item) => !importantCountries.includes(item.country))
      .sort((a, b) => b.count - a.count || a.country.localeCompare(b.country));
    return [...priority, ...rest];
  }, [countryOptions]);

  const noteLength = form.notes.trim().length;
  const missingRequirements = useMemo(() => {
    const items: string[] = [];
    if (!form.program_name?.trim()) items.push('programme name');
    if (!form.university_name?.trim()) items.push('university');
    if (!form.country?.trim()) items.push('country');
    if (noteLength < 20) items.push(`main experience needs ${20 - noteLength} more characters`);
    if (form.visibility !== 'private' && !form.pii_warning_accepted) items.push('PII confirmation');
    return items;
  }, [form, noteLength]);

  const canSubmit = missingRequirements.length === 0;

  const update = <K extends keyof ExperienceSubmission>(key: K, value: ExperienceSubmission[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const selectUniversity = (university: University) => {
    setUniversityQuery(university.name);
    setShowUniversityOptions(false);
    setForm((prev) => ({
      ...prev,
      university_id: university.id,
      university_name: university.name,
      country: university.country,
      city: university.city,
      course_id: undefined,
    }));
  };

  const changeUniversityName = (value: string) => {
    setUniversityQuery(value);
    setShowUniversityOptions(true);
    setForm((prev) => ({
      ...prev,
      university_id: undefined,
      course_id: undefined,
      university_name: value,
    }));
  };

  const changeCountry = (value: string) => {
    setForm((prev) => ({
      ...prev,
      country: value,
      university_id: undefined,
      course_id: undefined,
    }));
  };

  const ensureUniversity = async (payload: ExperienceSubmission) => {
    if (payload.university_id || !payload.university_name?.trim() || !payload.country?.trim()) {
      return payload;
    }

    const exact = universities.find((item) => (
      item.name.toLowerCase() === payload.university_name?.trim().toLowerCase() &&
      item.country.toLowerCase() === payload.country?.trim().toLowerCase()
    ));
    if (exact) {
      return { ...payload, university_id: exact.id, city: exact.city };
    }

    try {
      const created = await universityApi.create({
        name: payload.university_name.trim(),
        country: payload.country.trim(),
        city: payload.city?.trim() || 'Unknown',
      });
      return { ...payload, university_id: created.id, university_name: created.name, country: created.country, city: created.city };
    } catch (err) {
      console.info('University was not added to catalogue; submitting as custom university.', err);
      return payload;
    }
  };

  const submit = async () => {
    if (!canSubmit) {
      toast.error(`Complete: ${missingRequirements.join(', ')}`);
      return;
    }
    setSaving(true);
    try {
      const payload = await ensureUniversity({
        ...form,
        program_name: form.program_name?.trim(),
        university_name: form.university_name?.trim(),
        country: form.country?.trim(),
        city: form.city?.trim() || undefined,
        notes: form.notes.trim(),
      });
      const result = programId
        ? await experiencesApi.submitFromTracker(Number(programId), payload)
        : await experiencesApi.submit(payload);
      toast.success(result.moderation_status === 'draft' ? 'Experience saved privately' : 'Experience submitted for review');
      navigate('/experiences');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not submit experience');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageTransition><div className="mx-auto max-w-4xl px-4 py-8"><Skeleton className="h-96 rounded-lg" /></div></PageTransition>;
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Link to={program ? `/dashboard/programs/${program.id}` : '/experiences'} className="text-sm text-brand-primary hover:underline">{program ? 'Back to programme' : 'Back to experiences'}</Link>
        <div className="mt-5 rounded-lg border border-border bg-surface p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-text-primary">Share application experience</h1>
          <p className="mt-1 text-sm text-text-muted">Submitted experiences are reviewed before they appear publicly.</p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-text-secondary">Programme
              <input value={form.program_name || ''} onChange={(e) => update('program_name', e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-text-primary" />
            </label>

            <div className="relative text-sm font-medium text-text-secondary">
              <label htmlFor="experience-university">University</label>
              <input
                id="experience-university"
                value={universityQuery}
                onFocus={() => setShowUniversityOptions(true)}
                onChange={(e) => changeUniversityName(e.target.value)}
                placeholder="Search university or type a new one"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-text-primary"
              />
              {showUniversityOptions && universities.length > 0 && (
                <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-surface shadow-lg">
                  {universities.map((university) => (
                    <button
                      key={university.id}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectUniversity(university)}
                      className="block w-full px-3 py-2 text-left hover:bg-elevated"
                    >
                      <span className="block text-sm font-medium text-text-primary">{university.name}</span>
                      <span className="block text-xs text-text-muted">{university.city}, {university.country}</span>
                    </button>
                  ))}
                </div>
              )}
              <p className="mt-1 text-xs text-text-muted">Choose a catalogue match when possible. New names are saved with the experience and added to the catalogue in debug/admin mode.</p>
            </div>

            <label className="text-sm font-medium text-text-secondary">Country
              <input list="experience-country-options" value={form.country || ''} onChange={(e) => changeCountry(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-text-primary" />
              <datalist id="experience-country-options">
                {sortedCountryOptions.map((item) => <option key={item.country} value={item.country} />)}
              </datalist>
            </label>

            <label className="text-sm font-medium text-text-secondary">City
              <input value={form.city || ''} onChange={(e) => update('city', e.target.value)} placeholder="Optional" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-text-primary" />
            </label>

            <label className="text-sm font-medium text-text-secondary">Degree
              <select value={form.degree_level || 'masters'} onChange={(e) => update('degree_level', e.target.value as ExperienceDegreeLevel)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-text-primary">
                {degreeOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>

            <label className="text-sm font-medium text-text-secondary">Application year
              <select value={form.application_year} onChange={(e) => update('application_year', Number(e.target.value))} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-text-primary">
                {applicationYears.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </label>

            <label className="text-sm font-medium text-text-secondary">Round/intake
              <select value={form.application_round || 'Fall'} onChange={(e) => update('application_round', e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-text-primary">
                {intakeOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>

            <label className="text-sm font-medium text-text-secondary">Decision month
              <input type="month" value={toMonthInput(form.decision_date)} onChange={(e) => update('decision_date', fromMonthInput(e.target.value))} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-text-primary" />
            </label>

            <label className="text-sm font-medium text-text-secondary">Outcome
              <select value={form.status || 'accepted'} onChange={(e) => update('status', e.target.value as ExperienceApplicationStatus)} disabled={Boolean(program)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-text-primary disabled:opacity-70">
                {outcomeOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>

            <label className="text-sm font-medium text-text-secondary">Visibility
              <select value={form.visibility} onChange={(e) => update('visibility', e.target.value as ExperienceVisibility)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-text-primary">
                {visibilityOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <label className="flex items-center gap-2 rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-text-secondary"><input type="checkbox" checked={Boolean(form.scholarship_applied)} onChange={(e) => update('scholarship_applied', e.target.checked)} /> Applied for funding</label>
            <label className="flex items-center gap-2 rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-text-secondary"><input type="checkbox" checked={Boolean(form.scholarship_received)} onChange={(e) => update('scholarship_received', e.target.checked)} /> Received funding</label>
            <label className="flex items-center gap-2 rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-text-secondary"><input type="checkbox" checked={form.would_recommend === true} onChange={(e) => update('would_recommend', e.target.checked ? true : null)} /> Would recommend</label>
          </div>

          <label className="mt-5 block text-sm font-medium text-text-secondary">Main experience
            <textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={6} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-text-primary" placeholder="Timeline, documents, result, funding, and practical context" />
            <span className={`mt-1 block text-xs ${noteLength >= 20 ? 'text-text-muted' : 'text-status-danger'}`}>{noteLength}/20 minimum characters</span>
          </label>
          <label className="mt-4 block text-sm font-medium text-text-secondary">Interview experience
            <textarea value={form.interview_experience || ''} onChange={(e) => update('interview_experience', e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-text-primary" />
          </label>
          <label className="mt-4 block text-sm font-medium text-text-secondary">Advice for applicants
            <textarea value={form.advice_for_applicants || ''} onChange={(e) => update('advice_for_applicants', e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-text-primary" />
          </label>

          <label className="mt-5 flex items-start gap-3 rounded-lg border border-status-warning/30 bg-status-warning/10 p-4 text-sm text-text-secondary">
            <input type="checkbox" checked={form.pii_warning_accepted} onChange={(e) => update('pii_warning_accepted', e.target.checked)} className="mt-1" />
            <span>I understand this may be published after moderation. I removed passport numbers, application IDs, email addresses, phone numbers, exact addresses, and other personal data for myself and others.</span>
          </label>

          {!canSubmit && (
            <p className="mt-4 rounded-lg border border-status-danger/30 bg-status-danger/10 px-3 py-2 text-sm text-status-danger">
              Complete before submitting: {missingRequirements.join(', ')}.
            </p>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <Link to={program ? `/dashboard/programs/${program.id}` : '/experiences'} className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-elevated">Cancel</Link>
            <motion.button onClick={submit} disabled={!canSubmit || saving} whileHover={!canSubmit || saving ? undefined : { scale: 1.02 }} whileTap={!canSubmit || saving ? undefined : { scale: 0.97 }} className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Submitting...' : 'Submit for review'}</motion.button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
