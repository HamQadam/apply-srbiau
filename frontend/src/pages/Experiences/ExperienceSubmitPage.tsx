import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { experiencesApi, trackerApi, universityApi } from '../../api/services';
import { PageTransition } from '../../components/Transitions/PageTransition';
import { Skeleton } from '../../components/Feedback/Skeleton';
import { cn } from '../../lib/cn';
import type {
  ExperienceApplicationStatus,
  ExperienceDegreeLevel,
  ExperienceSubmission,
  ExperienceVisibility,
  TrackedProgram,
  University,
} from '../../types';

const currentYear = new Date().getFullYear();
const degreeOptions: ExperienceDegreeLevel[] = ['masters', 'phd', 'mba', 'postdoc'];
const visibilityOptions: ExperienceVisibility[] = ['anonymized', 'public', 'private'];
const outcomeOptions: ExperienceApplicationStatus[] = ['accepted', 'rejected', 'waitlisted', 'withdrawn'];
const intakeOptions = ['Fall', 'Winter', 'Spring', 'Summer'];
const importantCountries = [
  'Germany', 'Netherlands', 'Canada', 'United States', 'United Kingdom',
  'Australia', 'Sweden', 'Norway', 'Denmark', 'Finland', 'France', 'Italy',
  'Austria', 'Switzerland', 'Belgium', 'Spain', 'Iran',
];
const applicationYears = Array.from({ length: 21 }, (_, i) => currentYear - i);

function toMonthInput(value?: string | null) { return value ? value.slice(0, 7) : ''; }
function fromMonthInput(value: string) { return value ? `${value}-01` : null; }

// Section wrapper with label
function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-xl border border-border bg-surface p-6', className)}>
      <h2 className="text-sm font-semibold text-text-primary mb-5">{title}</h2>
      {children}
    </section>
  );
}

// Styled form field
function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-text-secondary mb-1.5">
        {label}
        {children}
      </label>
      {hint && <p className="text-[11px] text-text-muted mt-1">{hint}</p>}
    </div>
  );
}

const inputCls = 'mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-none';

export function ExperienceSubmitPage() {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
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
      .then(setCountryOptions)
      .catch(err => console.error('Failed to load countries:', err));
  }, []);

  useEffect(() => {
    const q = universityQuery.trim();
    if (q.length < 2) { setUniversities([]); return; }
    const handle = window.setTimeout(() => {
      universityApi.list({ query: q, limit: 8 })
        .then(setUniversities)
        .catch(() => setUniversities([]));
    }, 180);
    return () => window.clearTimeout(handle);
  }, [universityQuery]);

  useEffect(() => {
    if (!programId) { setLoading(false); return; }
    trackerApi.getProgram(Number(programId))
      .then(data => {
        const uniName = data.university_name || data.custom_university_name || '';
        setProgram(data);
        setUniversityQuery(uniName);
        setForm(prev => ({
          ...prev,
          program_name: data.program_name || data.custom_program_name || '',
          university_name: uniName,
          country: data.country || data.custom_country || '',
          course_id: data.course_id ?? undefined,
          application_deadline: data.deadline || data.custom_deadline || data.program_deadline || null,
          submitted_date: data.submitted_date || null,
          decision_date: data.result_date || null,
          application_round: data.intake ? data.intake.split('_')[0].replace(/^./, c => c.toUpperCase()) : prev.application_round,
          scholarship_received: data.scholarship_offered,
          scholarship_applied: data.scholarship_offered,
          scholarship_amount: data.scholarship_amount ? String(data.scholarship_amount) : '',
        }));
      })
      .catch(() => toast.error(t('experienceSubmit.loadError')))
      .finally(() => setLoading(false));
  }, [programId, t]);

  const sortedCountryOptions = useMemo(() => {
    const byCountry = new Map(countryOptions.map(i => [i.country, i]));
    const priority = importantCountries.map(c => byCountry.get(c) || { country: c, count: 0 });
    const rest = countryOptions.filter(i => !importantCountries.includes(i.country)).sort((a, b) => b.count - a.count || a.country.localeCompare(b.country));
    return [...priority, ...rest];
  }, [countryOptions]);

  const noteLength = form.notes.trim().length;
  const missingItems = useMemo(() => {
    const items: string[] = [];
    if (!form.program_name?.trim()) items.push(t('experienceSubmit.validation.programmeName'));
    if (!form.university_name?.trim()) items.push(t('experienceSubmit.validation.university'));
    if (!form.country?.trim()) items.push(t('experienceSubmit.validation.country'));
    if (noteLength < 20) items.push(t('experienceSubmit.validation.storyLength', { count: 20 - noteLength }));
    if (form.visibility !== 'private' && !form.pii_warning_accepted) items.push(t('experienceSubmit.validation.pii'));
    return items;
  }, [form, noteLength, t]);
  const canSubmit = missingItems.length === 0;

  const update = <K extends keyof ExperienceSubmission>(key: K, value: ExperienceSubmission[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const selectUniversity = (university: University) => {
    setUniversityQuery(university.name);
    setShowUniversityOptions(false);
    setForm(prev => ({ ...prev, university_id: university.id, university_name: university.name, country: university.country, city: university.city, course_id: undefined }));
  };

  const changeUniversityName = (value: string) => {
    setUniversityQuery(value);
    setShowUniversityOptions(true);
    setForm(prev => ({ ...prev, university_id: undefined, course_id: undefined, university_name: value }));
  };

  const changeCountry = (value: string) =>
    setForm(prev => ({ ...prev, country: value, university_id: undefined, course_id: undefined }));

  const ensureUniversity = async (payload: ExperienceSubmission) => {
    if (payload.university_id || !payload.university_name?.trim() || !payload.country?.trim()) return payload;
    const exact = universities.find(u => u.name.toLowerCase() === payload.university_name?.trim().toLowerCase() && u.country.toLowerCase() === payload.country?.trim().toLowerCase());
    if (exact) return { ...payload, university_id: exact.id, city: exact.city };
    try {
      const created = await universityApi.create({ name: payload.university_name.trim(), country: payload.country.trim(), city: payload.city?.trim() || 'Unknown' });
      return { ...payload, university_id: created.id, university_name: created.name, country: created.country, city: created.city };
    } catch { return payload; }
  };

  const submit = async () => {
    if (!canSubmit) { toast.error(t('experienceSubmit.validation.incomplete', { items: missingItems.join(', ') })); return; }
    setSaving(true);
    try {
      const payload = await ensureUniversity({ ...form, program_name: form.program_name?.trim(), university_name: form.university_name?.trim(), country: form.country?.trim(), city: form.city?.trim() || undefined, notes: form.notes.trim() });
      const result = programId
        ? await experiencesApi.submitFromTracker(Number(programId), payload)
        : await experiencesApi.submit(payload);
      toast.success(result.moderation_status === 'draft' ? t('experienceSubmit.successDraft') : t('experienceSubmit.successPublic'));
      navigate('/experiences');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('experienceSubmit.loadError'));
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

        {/* Breadcrumb */}
        <Link
          to={program ? `/dashboard/programs/${program.id}` : '/experiences'}
          className="inline-flex items-center gap-1 text-sm text-brand-primary hover:text-brand-primary/80 transition-colors mb-6"
        >
          <svg className="w-4 h-4 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
          {program ? t('experienceSubmit.backToProgram') : t('experienceSubmit.backToExperiences')}
        </Link>

        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary text-balance">{t('experienceSubmit.title')}</h1>
          <p className="mt-2 text-sm text-text-secondary text-pretty max-w-prose">{t('experienceSubmit.subtitle')}</p>
        </div>

        <div className="space-y-5">

          {/* Section 1: About the application */}
          <Section title={t('experienceSubmit.sections.program')}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('experienceSubmit.fields.program')}>
                <input
                  value={form.program_name || ''}
                  onChange={e => update('program_name', e.target.value)}
                  className={inputCls}
                />
              </Field>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  {t('experienceSubmit.fields.university')}
                </label>
                <div className="relative">
                  <input
                    id="experience-university"
                    value={universityQuery}
                    onFocus={() => setShowUniversityOptions(true)}
                    onBlur={() => setTimeout(() => setShowUniversityOptions(false), 150)}
                    onChange={e => changeUniversityName(e.target.value)}
                    placeholder={t('experienceSubmit.fields.universityPlaceholder')}
                    className={inputCls}
                  />
                  {showUniversityOptions && universities.length > 0 && (
                    <div className="absolute z-10 top-full mt-1 w-full max-h-56 overflow-auto rounded-lg border border-border bg-surface shadow-lg">
                      {universities.map(u => (
                        <button
                          key={u.id}
                          type="button"
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => selectUniversity(u)}
                          className="block w-full px-3 py-2.5 text-start hover:bg-elevated transition-colors"
                        >
                          <span className="block text-sm font-medium text-text-primary">{u.name}</span>
                          <span className="block text-xs text-text-muted">{u.city}, {u.country}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-text-muted mt-1">{t('experienceSubmit.fields.universityHint')}</p>
              </div>

              <Field label={t('experienceSubmit.fields.country')}>
                <input
                  list="experience-country-options"
                  value={form.country || ''}
                  onChange={e => changeCountry(e.target.value)}
                  className={inputCls}
                />
                <datalist id="experience-country-options">
                  {sortedCountryOptions.map(i => <option key={i.country} value={i.country} />)}
                </datalist>
              </Field>

              <Field label={t('experienceSubmit.fields.city')}>
                <input
                  value={form.city || ''}
                  onChange={e => update('city', e.target.value)}
                  className={inputCls}
                />
              </Field>

              <Field label={t('experienceSubmit.fields.degree')}>
                <select value={form.degree_level || 'masters'} onChange={e => update('degree_level', e.target.value as ExperienceDegreeLevel)} className={inputCls}>
                  {degreeOptions.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>

              <Field label={t('experienceSubmit.fields.visibility')}>
                <select value={form.visibility} onChange={e => update('visibility', e.target.value as ExperienceVisibility)} className={inputCls}>
                  {visibilityOptions.map(v => (
                    <option key={v} value={v}>{t(`experienceSubmit.visibility.${v}`)}</option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>

          {/* Section 2: Timeline */}
          <Section title={t('experienceSubmit.sections.timeline')}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={t('experienceSubmit.fields.year')}>
                <select value={form.application_year} onChange={e => update('application_year', Number(e.target.value))} className={inputCls}>
                  {applicationYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </Field>
              <Field label={t('experienceSubmit.fields.round')}>
                <select value={form.application_round || 'Fall'} onChange={e => update('application_round', e.target.value)} className={inputCls}>
                  {intakeOptions.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </Field>
              <Field label={t('experienceSubmit.fields.decisionMonth')}>
                <input
                  type="month"
                  value={toMonthInput(form.decision_date)}
                  onChange={e => update('decision_date', fromMonthInput(e.target.value))}
                  className={inputCls}
                />
              </Field>
            </div>
          </Section>

          {/* Section 3: Outcome and funding */}
          <Section title={t('experienceSubmit.sections.outcome')}>
            <div className="grid gap-4 sm:grid-cols-2 mb-5">
              <Field label={t('experienceSubmit.fields.outcome')}>
                <select
                  value={form.status || 'accepted'}
                  onChange={e => update('status', e.target.value as ExperienceApplicationStatus)}
                  disabled={Boolean(program)}
                  className={cn(inputCls, 'disabled:opacity-60')}
                >
                  {outcomeOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  { key: 'scholarship_applied', label: t('experienceSubmit.fields.scholarshipApplied') },
                  { key: 'scholarship_received', label: t('experienceSubmit.fields.scholarshipReceived') },
                  { key: 'would_recommend_checkbox', label: t('experienceSubmit.fields.wouldRecommend') },
                ] as const
              ).map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2.5 px-3 py-2.5 border border-border rounded-lg bg-elevated cursor-pointer hover:bg-border/50 transition-colors text-xs font-medium text-text-secondary">
                  <input
                    type="checkbox"
                    checked={key === 'would_recommend_checkbox' ? form.would_recommend === true : Boolean(form[key as 'scholarship_applied' | 'scholarship_received'])}
                    onChange={e => {
                      if (key === 'would_recommend_checkbox') update('would_recommend', e.target.checked ? true : null);
                      else update(key as 'scholarship_applied' | 'scholarship_received', e.target.checked);
                    }}
                    className="h-4 w-4 rounded border-border text-brand-primary focus:ring-brand-primary"
                  />
                  {label}
                </label>
              ))}
            </div>
          </Section>

          {/* Section 4: Your story */}
          <Section title={t('experienceSubmit.sections.story')}>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  {t('experienceSubmit.fields.mainExperience')}
                  <span className="text-status-danger ms-1">*</span>
                </label>
                <textarea
                  value={form.notes}
                  onChange={e => update('notes', e.target.value)}
                  rows={7}
                  placeholder={t('experienceSubmit.fields.mainExperiencePlaceholder')}
                  className={cn(inputCls, 'resize-none mt-1')}
                />
                <p className={cn('text-[11px] mt-1', noteLength >= 20 ? 'text-text-muted' : 'text-status-danger')}>
                  {t('experienceSubmit.fields.mainExperienceHint', { count: noteLength })}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  {t('experienceSubmit.fields.interviewExperience')}
                </label>
                <textarea
                  value={form.interview_experience || ''}
                  onChange={e => update('interview_experience', e.target.value)}
                  rows={3}
                  className={cn(inputCls, 'resize-none mt-1')}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  {t('experienceSubmit.fields.advice')}
                </label>
                <textarea
                  value={form.advice_for_applicants || ''}
                  onChange={e => update('advice_for_applicants', e.target.value)}
                  rows={3}
                  className={cn(inputCls, 'resize-none mt-1')}
                />
              </div>
            </div>
          </Section>

          {/* Section 5: Privacy */}
          <Section title={t('experienceSubmit.sections.privacy')}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.pii_warning_accepted}
                onChange={e => update('pii_warning_accepted', e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border text-brand-primary focus:ring-brand-primary flex-shrink-0"
              />
              <span className="text-sm text-text-secondary leading-snug">{t('experienceSubmit.piiWarning')}</span>
            </label>
          </Section>

          {/* Validation summary */}
          {missingItems.length > 0 && (
            <div className="rounded-lg border border-status-danger/30 bg-status-danger/5 px-4 py-3">
              <p className="text-xs font-medium text-status-danger mb-1">{t('experienceSubmit.validation.incomplete', { items: '' })}</p>
              <ul className="list-disc list-inside space-y-0.5">
                {missingItems.map(item => (
                  <li key={item} className="text-xs text-status-danger">{item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              to={program ? `/dashboard/programs/${program.id}` : '/experiences'}
              className="px-4 py-2.5 text-sm font-medium text-text-secondary border border-border rounded-lg hover:bg-elevated transition-colors"
            >
              {t('experienceSubmit.cancel')}
            </Link>
            <motion.button
              onClick={submit}
              disabled={!canSubmit || saving}
              whileHover={!canSubmit || saving ? undefined : { scale: 1.02 }}
              whileTap={!canSubmit || saving ? undefined : { scale: 0.97 }}
              className="px-6 py-2.5 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? t('experienceSubmit.submitting') : t('experienceSubmit.submit')}
            </motion.button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
