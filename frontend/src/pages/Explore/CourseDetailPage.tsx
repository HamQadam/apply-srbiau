import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { courseApi, trackerApi } from '../../api/services';
import { Skeleton } from '../../components/Feedback/Skeleton';
import { Spinner } from '../../components/Feedback/Spinner';
import { PageTransition } from '../../components/Transitions/PageTransition';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDate } from '../../lib/format';
import { cn } from '../../lib/cn';
import type { Course, CourseLanguageRequirement } from '../../types';

// GPA scale note — German system (1 = best) vs US/Iran 4.0 system (4 = best)
const GERMAN_SYSTEM_COUNTRIES = new Set(['Germany', 'Austria', 'Switzerland', 'Netherlands', 'Belgium']);
function getGpaScaleNote(country: string | null | undefined, t: (k: string, opts?: { defaultValue: string }) => string): string {
  if (!country) return '';
  if (GERMAN_SYSTEM_COUNTRIES.has(country)) return t('courseDetail.gpaGermanScale', { defaultValue: '(1–4, lower is better)' });
  return t('courseDetail.gpaUsScale', { defaultValue: '(0–4.0)' });
}

const getFreshnessState = (course: Course) => {
  const sourceDate = course.last_verified_at || course.updated_at || course.created_at;
  if (!sourceDate) return { key: 'unknown', date: null as string | null };
  const ageDays = Math.floor((Date.now() - new Date(sourceDate).getTime()) / 86_400_000);
  if (Number.isNaN(ageDays)) return { key: 'unknown', date: null as string | null };
  if (ageDays <= 90) return { key: 'fresh', date: sourceDate };
  if (ageDays <= 365) return { key: 'aging', date: sourceDate };
  return { key: 'stale', date: sourceDate };
};

const scoreParts = (req: CourseLanguageRequirement) =>
  ([
    req.minimum_overall != null ? ['overall', req.minimum_overall] : null,
    req.minimum_reading != null ? ['reading', req.minimum_reading] : null,
    req.minimum_writing != null ? ['writing', req.minimum_writing] : null,
    req.minimum_speaking != null ? ['speaking', req.minimum_speaking] : null,
    req.minimum_listening != null ? ['listening', req.minimum_listening] : null,
  ].filter(Boolean)) as Array<[string, number]>;

// Inline data row — label + value on a ruled background
function DataRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 px-4 py-3', highlight ? 'bg-brand-primary/5' : 'bg-elevated/60')}>
      <span className="text-xs font-medium text-text-muted flex-shrink-0">{label}</span>
      <span className={cn('text-sm font-semibold text-end', highlight ? 'text-brand-primary' : 'text-text-primary')}>{value}</span>
    </div>
  );
}

export function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { t, i18n } = useTranslation();
  const [course, setCourse] = useState<Course | null>(null);
  const [requirements, setRequirements] = useState<CourseLanguageRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => { loadCourse(); }, [id]);

  const loadCourse = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [courseData, languageData] = await Promise.all([
        courseApi.get(Number(id)),
        courseApi.getLanguageRequirements(Number(id)).catch(() => []),
      ]);
      setCourse(courseData);
      setRequirements(languageData);
    } catch (err) {
      console.error('Failed to load course:', err);
      toast.error(t('courseDetail.loadError'));
    } finally { setLoading(false); }
  };

  const handleAddToTracker = async () => {
    if (!course) return;
    if (!isAuthenticated) { navigate('/login', { state: { from: `/courses/${course.id}` } }); return; }
    setAdding(true);
    try {
      await trackerApi.addProgram({ course_id: course.id });
      toast.success(t('explore.added'));
      navigate('/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('explore.addError'));
    } finally { setAdding(false); }
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-32 rounded-xl" />
          <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
            <div className="space-y-4"><Skeleton className="h-48 rounded-xl" /><Skeleton className="h-32 rounded-xl" /></div>
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!course) {
    return (
      <PageTransition>
        <div className="max-w-5xl mx-auto px-4 py-16 text-center">
          <p className="text-text-muted">{t('courseDetail.notFound')}</p>
          <Link to="/explore" className="mt-4 inline-block text-sm text-brand-primary hover:text-brand-primary/80">{t('courseDetail.backToExplore')}</Link>
        </div>
      </PageTransition>
    );
  }

  const freshness = getFreshnessState(course);
  const tuitionLabel = course.is_tuition_free
    ? t('courseDetail.freeTuition')
    : course.tuition_fee_amount
      ? `${formatCurrency(course.tuition_fee_amount, i18n.language, course.tuition_fee_currency ?? 'EUR')} ${t('explore.badges.perYear')}`
      : t('courseDetail.unknown');

  // Deadline: pick the most relevant one to highlight
  const primaryDeadline = course.deadline_fall || course.deadline_spring;

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Back */}
        <Link to="/explore" className="inline-flex items-center gap-1 text-sm text-brand-primary hover:text-brand-primary/80 transition-colors mb-6">
          <svg className="w-4 h-4 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
          {t('courseDetail.backToExplore')}
        </Link>

        {/* ── Hero header ── */}
        <div className="rounded-xl border border-border bg-surface p-6 mb-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1 min-w-0">
              {/* Chips — degree, language, ranking */}
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="text-xs font-medium px-2.5 py-1 bg-brand-primary/10 text-brand-primary rounded-full">
                  {t(`degree.${course.degree_level}`)}
                </span>
                <span className="text-xs font-medium px-2.5 py-1 bg-elevated text-text-secondary rounded-full">
                  {t(`language.${course.teaching_language}`)}
                </span>
                {course.university_ranking_qs && (
                  <span className="text-xs font-medium px-2.5 py-1 bg-elevated text-text-secondary rounded-full">
                    QS #{course.university_ranking_qs}
                  </span>
                )}
                {course.is_tuition_free && (
                  <span className="text-xs font-medium px-2.5 py-1 bg-status-success/10 text-status-success rounded-full">
                    {t('courseDetail.freeTuition')}
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold text-text-primary text-balance leading-snug">{course.name}</h1>
              <p className="mt-2 text-text-secondary text-sm">{course.university_name}</p>
              <p className="text-text-muted text-xs mt-0.5">{course.university_city}, {course.university_country}</p>
            </div>

            {/* CTA — always visible in header */}
            <div className="flex-shrink-0">
              <motion.button
                onClick={handleAddToTracker}
                disabled={adding}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="w-full lg:w-auto px-6 py-3 bg-brand-primary text-white text-sm font-semibold rounded-lg hover:bg-brand-primary/90 transition-colors disabled:opacity-50"
              >
                {adding ? (
                  <span className="flex items-center gap-2">
                    <Spinner className="h-4 w-4 border-white border-t-transparent" />
                    {t('explore.adding')}
                  </span>
                ) : t('explore.addToTracker')}
              </motion.button>
              {primaryDeadline && (
                <p className="text-xs text-text-muted text-center mt-2">
                  {t('courseDetail.deadlineFall')}: {formatDate(primaryDeadline, i18n.language, { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Two-column body ── */}
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">

          {/* Main column */}
          <div className="space-y-6">

            {/* Decision-relevant facts — what matters most to the applicant */}
            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-text-primary">{t('courseDetail.overview')}</h2>
              </div>
              <div className="divide-y divide-border">
                {primaryDeadline && (
                  <DataRow
                    label={course.deadline_fall ? t('courseDetail.deadlineFall') : t('courseDetail.deadlineSpring')}
                    value={formatDate(primaryDeadline, i18n.language, { year: 'numeric', month: 'long', day: 'numeric' })}
                    highlight
                  />
                )}
                <DataRow label={t('courseDetail.tuition')} value={tuitionLabel} highlight={course.is_tuition_free} />
                {course.deadline_fall && course.deadline_spring && (
                  <DataRow
                    label={t('courseDetail.deadlineSpring')}
                    value={formatDate(course.deadline_spring, i18n.language, { year: 'numeric', month: 'long', day: 'numeric' })}
                  />
                )}
                {course.duration_months && (
                  <DataRow label={t('courseDetail.duration')} value={t('courseDetail.months', { count: course.duration_months })} />
                )}
                {course.field && (
                  <DataRow label={t('courseDetail.field')} value={course.field} />
                )}
                {course.gpa_minimum != null && (
                  <DataRow
                    label={t('courseDetail.gpa')}
                    value={`${course.gpa_minimum} ${getGpaScaleNote(course.university_country, t)}`}
                  />
                )}
              </div>
              {course.deadline_notes && (
                <div className="px-4 py-3 border-t border-border">
                  <p className="text-xs text-text-secondary">{course.deadline_notes}</p>
                </div>
              )}
            </div>

            {/* Language requirements */}
            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-text-primary">{t('courseDetail.languageRequirements')}</h2>
              </div>
              {requirements.length === 0 ? (
                <p className="px-5 py-4 text-sm text-text-muted">{t('courseDetail.noLanguageRequirements')}</p>
              ) : (
                <div className="divide-y divide-border">
                  {requirements.map(req => (
                    <div key={req.id} className="px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-text-primary uppercase">{req.test_type.replace('_', ' ')}</span>
                        {req.cefr_level && <span className="text-xs font-medium px-2 py-0.5 bg-elevated text-text-secondary rounded-full">{req.cefr_level}</span>}
                        {req.certificate_level && <span className="text-xs font-medium px-2 py-0.5 bg-elevated text-text-secondary rounded-full">{req.certificate_level}</span>}
                      </div>
                      {scoreParts(req).length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {scoreParts(req).map(([key, value]) => (
                            <span key={key} className="text-xs text-text-secondary bg-elevated px-2.5 py-1 rounded-full">
                              {t(`courseDetail.scores.${key}`)}: <span className="font-semibold text-text-primary">{value}</span>
                            </span>
                          ))}
                        </div>
                      )}
                      {req.notes && <p className="mt-2 text-xs text-text-muted">{req.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Description / notes / scholarship details */}
            {(course.description || course.notes || course.scholarship_details) && (
              <div className="rounded-xl border border-border bg-surface p-5">
                <h2 className="text-sm font-semibold text-text-primary mb-3">{t('courseDetail.details')}</h2>
                <div className="space-y-3 text-sm leading-6 text-text-secondary">
                  {course.description && <p className="text-pretty">{course.description}</p>}
                  {course.notes && <p className="text-pretty">{course.notes}</p>}
                  {course.scholarship_details && (
                    <div className="rounded-lg bg-status-success/5 border border-status-success/20 p-3 text-status-success text-xs">
                      {course.scholarship_details}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Sidebar */}
          <div className="space-y-5">

            {/* Source + freshness */}
            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-text-primary">{t('courseDetail.source')}</h2>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div>
                  <p className="text-xs font-medium text-text-muted mb-1">{t('courseDetail.freshness')}</p>
                  <p className={cn(
                    'text-xs font-medium',
                    freshness.key === 'fresh' ? 'text-status-success' :
                    freshness.key === 'aging' ? 'text-status-warning' :
                    'text-status-danger'
                  )}>
                    {t(`explore.freshness.${freshness.key}`)}
                  </p>
                  {freshness.date && (
                    <p className="text-[11px] text-text-muted mt-0.5">
                      {formatDate(freshness.date, i18n.language, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  )}
                </div>

                {course.program_url && (
                  <a
                    href={course.program_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 px-3 py-2.5 border border-border rounded-lg text-sm font-medium text-brand-primary hover:bg-elevated transition-colors"
                  >
                    {t('courseDetail.officialProgram')}
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                    </svg>
                  </a>
                )}
                {course.application_url && (
                  <a
                    href={course.application_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 px-3 py-2.5 border border-border rounded-lg text-sm font-medium text-brand-primary hover:bg-elevated transition-colors"
                  >
                    {t('courseDetail.applicationPage')}
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                    </svg>
                  </a>
                )}
              </div>
            </div>

            {/* Mobile: repeated CTA at bottom of sidebar */}
            <div className="lg:hidden">
              <motion.button
                onClick={handleAddToTracker}
                disabled={adding}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.97 }}
                className="w-full py-3 bg-brand-primary text-white text-sm font-semibold rounded-lg hover:bg-brand-primary/90 transition-colors disabled:opacity-50"
              >
                {adding ? t('explore.adding') : t('explore.addToTracker')}
              </motion.button>
            </div>

          </div>
        </div>
      </div>
    </PageTransition>
  );
}
