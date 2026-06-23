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
import type { Course, CourseLanguageRequirement } from '../../types';

const getFreshnessState = (course: Course) => {
  const sourceDate = course.last_verified_at || course.updated_at || course.created_at;
  if (!sourceDate) return { key: 'unknown', date: null as string | null };

  const ageDays = Math.floor((Date.now() - new Date(sourceDate).getTime()) / 86_400_000);
  if (Number.isNaN(ageDays)) return { key: 'unknown', date: null as string | null };
  if (ageDays <= 90) return { key: 'fresh', date: sourceDate };
  if (ageDays <= 365) return { key: 'aging', date: sourceDate };
  return { key: 'stale', date: sourceDate };
};

const scoreParts = (requirement: CourseLanguageRequirement) => [
  requirement.minimum_overall != null ? ['overall', requirement.minimum_overall] : null,
  requirement.minimum_reading != null ? ['reading', requirement.minimum_reading] : null,
  requirement.minimum_writing != null ? ['writing', requirement.minimum_writing] : null,
  requirement.minimum_speaking != null ? ['speaking', requirement.minimum_speaking] : null,
  requirement.minimum_listening != null ? ['listening', requirement.minimum_listening] : null,
].filter(Boolean) as Array<[string, number]>;

export function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { t, i18n } = useTranslation();
  const [course, setCourse] = useState<Course | null>(null);
  const [requirements, setRequirements] = useState<CourseLanguageRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadCourse();
  }, [id]);

  const loadCourse = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const courseId = Number(id);
      const [courseData, languageData] = await Promise.all([
        courseApi.get(courseId),
        courseApi.getLanguageRequirements(courseId).catch(() => []),
      ]);
      setCourse(courseData);
      setRequirements(languageData);
    } catch (err) {
      console.error('Failed to load course:', err);
      toast.error(t('courseDetail.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddToTracker = async () => {
    if (!course) return;
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/courses/${course.id}` } });
      return;
    }

    setAdding(true);
    try {
      await trackerApi.addProgram({ course_id: course.id });
      toast.success(t('explore.added'));
      navigate('/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('explore.addError'));
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-5xl px-4 py-8 space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </PageTransition>
    );
  }

  if (!course) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-5xl px-4 py-16 text-center">
          <p className="text-text-muted">{t('courseDetail.notFound')}</p>
          <Link to="/explore" className="mt-4 inline-block text-brand-primary hover:text-brand-secondary">
            {t('courseDetail.backToExplore')}
          </Link>
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

  return (
    <PageTransition>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Link to="/explore" className="mb-6 inline-flex items-center text-sm font-medium text-brand-primary hover:text-brand-secondary">
          {t('courseDetail.backToExplore')}
        </Link>

        <section className="mb-6 rounded-xl border border-border bg-surface p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-brand-primary/10 px-2.5 py-1 font-medium text-brand-primary">{t(`degree.${course.degree_level}`)}</span>
                <span className="rounded-full bg-elevated px-2.5 py-1 text-text-secondary">{t(`language.${course.teaching_language}`)}</span>
                {course.university_ranking_qs && <span className="rounded-full bg-elevated px-2.5 py-1 text-text-secondary">{t('explore.qsRank', { rank: course.university_ranking_qs })}</span>}
              </div>
              <h1 className="text-2xl font-bold text-text-primary">{course.name}</h1>
              <p className="mt-2 text-text-secondary">{course.university_name}</p>
              <p className="mt-1 text-sm text-text-muted">{course.university_city}, {course.university_country}</p>
            </div>

            <motion.button
              onClick={handleAddToTracker}
              disabled={adding}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-secondary disabled:opacity-50"
            >
              {adding ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner className="h-4 w-4 border-white border-t-transparent" />
                  {t('explore.adding')}
                </span>
              ) : t('explore.addToTracker')}
            </motion.button>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
          <main className="space-y-6">
            <section className="rounded-xl border border-border bg-surface p-5">
              <h2 className="mb-4 text-lg font-semibold text-text-primary">{t('courseDetail.overview')}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoRow label={t('courseDetail.field')} value={course.field} />
                <InfoRow label={t('courseDetail.tuition')} value={tuitionLabel} />
                <InfoRow label={t('courseDetail.duration')} value={course.duration_months ? t('courseDetail.months', { count: course.duration_months }) : t('courseDetail.unknown')} />
                <InfoRow label={t('courseDetail.deadlineFall')} value={course.deadline_fall ? formatDate(course.deadline_fall, i18n.language, { year: 'numeric', month: 'long', day: 'numeric' }) : t('courseDetail.unknown')} />
                <InfoRow label={t('courseDetail.deadlineSpring')} value={course.deadline_spring ? formatDate(course.deadline_spring, i18n.language, { year: 'numeric', month: 'long', day: 'numeric' }) : t('courseDetail.unknown')} />
                <InfoRow label={t('courseDetail.gpa')} value={course.gpa_minimum != null ? String(course.gpa_minimum) : t('courseDetail.unknown')} />
              </div>
              {course.deadline_notes && <p className="mt-4 rounded-lg bg-elevated p-3 text-sm text-text-secondary">{course.deadline_notes}</p>}
            </section>

            {(course.description || course.notes || course.scholarship_details) && (
              <section className="rounded-xl border border-border bg-surface p-5">
                <h2 className="mb-3 text-lg font-semibold text-text-primary">{t('courseDetail.details')}</h2>
                <div className="space-y-3 text-sm leading-6 text-text-secondary">
                  {course.description && <p>{course.description}</p>}
                  {course.notes && <p>{course.notes}</p>}
                  {course.scholarship_details && <p>{course.scholarship_details}</p>}
                </div>
              </section>
            )}

            <section className="rounded-xl border border-border bg-surface p-5">
              <h2 className="mb-4 text-lg font-semibold text-text-primary">{t('courseDetail.languageRequirements')}</h2>
              {requirements.length === 0 ? (
                <p className="text-sm text-text-muted">{t('courseDetail.noLanguageRequirements')}</p>
              ) : (
                <div className="space-y-3">
                  {requirements.map((requirement) => (
                    <div key={requirement.id} className="rounded-lg border border-border p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium uppercase text-text-primary">{requirement.test_type.replace('_', ' ')}</span>
                        {requirement.cefr_level && <span className="rounded-full bg-elevated px-2 py-0.5 text-xs text-text-secondary">{requirement.cefr_level}</span>}
                        {requirement.certificate_level && <span className="rounded-full bg-elevated px-2 py-0.5 text-xs text-text-secondary">{requirement.certificate_level}</span>}
                      </div>
                      {scoreParts(requirement).length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-secondary">
                          {scoreParts(requirement).map(([key, value]) => (
                            <span key={key} className="rounded-full bg-elevated px-2 py-1">
                              {t(`courseDetail.scores.${key}`)}: {value}
                            </span>
                          ))}
                        </div>
                      )}
                      {requirement.notes && <p className="mt-3 text-sm text-text-muted">{requirement.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </main>

          <aside className="space-y-6">
            <section className="rounded-xl border border-border bg-surface p-5">
              <h2 className="mb-3 text-lg font-semibold text-text-primary">{t('courseDetail.source')}</h2>
              <div className="space-y-3 text-sm text-text-secondary">
                <div>
                  <p className="text-xs font-medium text-text-muted">{t('courseDetail.freshness')}</p>
                  <p>{t(`explore.freshness.${freshness.key}`)}</p>
                  {freshness.date && <p className="text-xs text-text-muted">{formatDate(freshness.date, i18n.language, { year: 'numeric', month: 'long', day: 'numeric' })}</p>}
                </div>
                {course.program_url && (
                  <a href={course.program_url} target="_blank" rel="noopener noreferrer" className="block rounded-lg border border-border px-3 py-2 text-center font-medium text-brand-primary hover:bg-elevated">
                    {t('courseDetail.officialProgram')}
                  </a>
                )}
                {course.application_url && (
                  <a href={course.application_url} target="_blank" rel="noopener noreferrer" className="block rounded-lg border border-border px-3 py-2 text-center font-medium text-brand-primary hover:bg-elevated">
                    {t('courseDetail.applicationPage')}
                  </a>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </PageTransition>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-elevated px-3 py-2">
      <p className="text-xs font-medium text-text-muted">{label}</p>
      <p className="mt-1 text-sm text-text-primary">{value}</p>
    </div>
  );
}
