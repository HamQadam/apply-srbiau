import { motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { courseApi, universityApi, trackerApi } from '../../api/services';
import { useAuth } from '../../contexts/AuthContext';
import { PageTransition } from '../../components/Transitions/PageTransition';
import { MultiSelectCombobox } from '../../components/Form/MultiSelectCombobox';
import { Skeleton } from '../../components/Feedback/Skeleton';
import { Spinner } from '../../components/Feedback/Spinner';
import { cn } from '../../lib/cn';
import { formatCurrency, formatDate } from '../../lib/format';
import type { Course, DegreeLevel, TeachingLanguage } from '../../types';

const PAGE_SIZE = 24;
const TOO_MANY_RESULTS_THRESHOLD = 200;

const addMonths = (date: Date, months: number) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

const toISODate = (date: Date) => date.toISOString().slice(0, 10);

const getDeadlineBounds = (value: string) => {
  const today = new Date();
  if (value === 'future') return { deadline_after: toISODate(today) };
  if (value === 'next3') return { deadline_after: toISODate(today), deadline_before: toISODate(addMonths(today, 3)) };
  if (value === 'next6') return { deadline_after: toISODate(today), deadline_before: toISODate(addMonths(today, 6)) };
  return {};
};

const getFreshnessState = (course: Course) => {
  const sourceDate = course.last_verified_at || course.updated_at || course.created_at;
  if (!sourceDate) return { key: 'unknown', date: null as string | null };

  const ageDays = Math.floor((Date.now() - new Date(sourceDate).getTime()) / 86_400_000);
  if (Number.isNaN(ageDays)) return { key: 'unknown', date: null as string | null };
  if (ageDays <= 90) return { key: 'fresh', date: sourceDate };
  if (ageDays <= 365) return { key: 'aging', date: sourceDate };
  return { key: 'stale', date: sourceDate };
};

export function ExplorePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { t, i18n } = useTranslation();

  const [courses, setCourses] = useState<Course[]>([]);
  const [total, setTotal] = useState(0);
  const [countries, setCountries] = useState<Array<{ country: string; count: number }>>([]);
  const [fields, setFields] = useState<Array<{ field: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [adding, setAdding] = useState<number | null>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const query = searchParams.get('q') || '';
  const selectedCountries = useMemo(() => searchParams.getAll('countries'), [searchParams]);
  const selectedFields = useMemo(() => searchParams.getAll('fields'), [searchParams]);
  const degreeLevel = (searchParams.get('degree') || '') as DegreeLevel | '';
  const teachingLanguage = (searchParams.get('language') || '') as TeachingLanguage | '';
  const tuitionFreeOnly = searchParams.get('tuitionFree') === 'true';
  const maxTuition = searchParams.get('maxTuition') || '';
  const deadlineRange = searchParams.get('deadline') || '';

  const updateFilters = useCallback((updates: {
    q?: string;
    countries?: string[];
    fields?: string[];
    degree?: string;
    language?: string;
    tuitionFree?: boolean;
    maxTuition?: string;
    deadline?: string;
  }) => {
    const newParams = new URLSearchParams(searchParams);

    if (updates.q !== undefined) updates.q ? newParams.set('q', updates.q) : newParams.delete('q');
    if (updates.countries !== undefined) {
      newParams.delete('countries');
      updates.countries.forEach((country) => newParams.append('countries', country));
    }
    if (updates.fields !== undefined) {
      newParams.delete('fields');
      updates.fields.forEach((field) => newParams.append('fields', field));
    }
    if (updates.degree !== undefined) updates.degree ? newParams.set('degree', updates.degree) : newParams.delete('degree');
    if (updates.language !== undefined) updates.language ? newParams.set('language', updates.language) : newParams.delete('language');
    if (updates.tuitionFree !== undefined) updates.tuitionFree ? newParams.set('tuitionFree', 'true') : newParams.delete('tuitionFree');
    if (updates.maxTuition !== undefined) updates.maxTuition ? newParams.set('maxTuition', updates.maxTuition) : newParams.delete('maxTuition');
    if (updates.deadline !== undefined) updates.deadline ? newParams.set('deadline', updates.deadline) : newParams.delete('deadline');

    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    if (initialLoadDone) searchCourses(false);
  }, [query, selectedCountries, selectedFields, degreeLevel, teachingLanguage, tuitionFreeOnly, maxTuition, deadlineRange, initialLoadDone]);

  const loadFilterOptions = async () => {
    try {
      const [countriesData, fieldsData] = await Promise.all([
        universityApi.getCountries(),
        courseApi.getFields(5),
      ]);
      setCountries(countriesData);
      setFields(fieldsData);
    } catch (err) {
      console.error('Failed to load filters:', err);
      toast.error(t('explore.filtersError'));
    } finally {
      setInitialLoadDone(true);
    }
  };

  const searchCourses = async (append = false) => {
    append ? setLoadingMore(true) : setLoading(true);

    try {
      const deadlineBounds = getDeadlineBounds(deadlineRange);
      const data = await courseApi.search({
        query: query || undefined,
        countries: selectedCountries.length > 0 ? selectedCountries : undefined,
        fields: selectedFields.length > 0 ? selectedFields : undefined,
        degree_level: degreeLevel || undefined,
        teaching_language: teachingLanguage || undefined,
        tuition_free_only: tuitionFreeOnly,
        max_tuition: maxTuition ? Number(maxTuition) : undefined,
        ...deadlineBounds,
        limit: PAGE_SIZE,
        offset: append ? courses.length : 0,
      });

      setCourses((prev) => append ? [...prev, ...data.courses] : data.courses);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to search:', err);
      toast.error(t('explore.searchError'));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleAddToTracker = async (courseId: number) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/explore?${searchParams.toString()}` } });
      return;
    }

    setAdding(courseId);
    try {
      await trackerApi.addProgram({ course_id: courseId });
      toast.success(t('explore.added'));
      navigate('/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('explore.addError'));
    } finally {
      setAdding(null);
    }
  };

  const [searchInput, setSearchInput] = useState(query);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== query) updateFilters({ q: searchInput });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, query, updateFilters]);

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  const countryOptions = useMemo(() => countries.map((country) => ({
    value: country.country,
    label: country.country,
    count: country.count,
  })), [countries]);

  const fieldOptions = useMemo(() => fields.map((field) => ({
    value: field.field,
    label: field.field,
    count: field.count,
  })), [fields]);

  const hasMore = courses.length < total;
  const remainingCount = total - courses.length;
  const hasActiveFilters = selectedCountries.length > 0 || selectedFields.length > 0 || degreeLevel || teachingLanguage || tuitionFreeOnly || maxTuition || deadlineRange || query;
  const showTooManyResults = !loading && total > TOO_MANY_RESULTS_THRESHOLD;

  const activeFilters = [
    query ? t('explore.active.search', { value: query }) : null,
    ...selectedCountries.map((country) => t('explore.active.country', { value: country })),
    ...selectedFields.map((field) => t('explore.active.field', { value: field })),
    degreeLevel ? t('explore.active.degree', { value: t(`degree.${degreeLevel}`) }) : null,
    teachingLanguage ? t('explore.active.language', { value: t(`language.${teachingLanguage}`) }) : null,
    tuitionFreeOnly ? t('explore.active.tuitionFree') : null,
    maxTuition ? t('explore.active.maxTuition', { value: formatCurrency(Number(maxTuition), i18n.language, 'EUR') }) : null,
    deadlineRange ? t(`explore.deadlines.${deadlineRange}`) : null,
  ].filter(Boolean) as string[];

  const resetFilters = () => {
    setSearchParams(new URLSearchParams());
    setSearchInput('');
  };

  return (
    <PageTransition>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary">{t('explore.title')}</h1>
          <p className="mt-1 text-text-muted">{t('explore.subtitle')}</p>
        </div>

        <div className="mb-6 rounded-xl border border-border bg-surface p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-text-secondary">{t('explore.filters.search')}</span>
              <input
                type="text"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder={t('explore.searchPlaceholder')}
                className="min-h-[42px] w-full rounded-lg border border-border bg-background px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-brand-primary"
              />
            </label>

            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-text-secondary">{t('explore.filters.country')}</span>
              <MultiSelectCombobox
                options={countryOptions}
                selected={selectedCountries}
                onChange={(countries) => updateFilters({ countries })}
                placeholder={t('explore.filters.allCountries')}
                searchPlaceholder={t('explore.filters.searchCountries')}
                emptyMessage={t('explore.filters.noCountries')}
              />
            </div>

            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-text-secondary">{t('explore.filters.field')}</span>
              <MultiSelectCombobox
                options={fieldOptions}
                selected={selectedFields}
                onChange={(fields) => updateFilters({ fields })}
                placeholder={t('explore.filters.allFields')}
                searchPlaceholder={t('explore.filters.searchFields')}
                emptyMessage={t('explore.filters.noFields')}
                maxSelections={5}
              />
            </div>

            <label className="space-y-1.5">
              <span className="text-xs font-medium text-text-secondary">{t('explore.filters.degree')}</span>
              <select
                value={degreeLevel}
                onChange={(event) => updateFilters({ degree: event.target.value })}
                className="min-h-[42px] w-full rounded-lg border border-border bg-background px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-brand-primary"
              >
                <option value="">{t('explore.filters.allDegrees')}</option>
                <option value="bachelor">{t('degree.bachelor')}</option>
                <option value="master">{t('degree.master')}</option>
                <option value="phd">{t('degree.phd')}</option>
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-medium text-text-secondary">{t('explore.filters.language')}</span>
              <select
                value={teachingLanguage}
                onChange={(event) => updateFilters({ language: event.target.value })}
                className="min-h-[42px] w-full rounded-lg border border-border bg-background px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-brand-primary"
              >
                <option value="">{t('explore.filters.allLanguages')}</option>
                <option value="english">{t('language.english')}</option>
                <option value="german">{t('language.german')}</option>
                <option value="dutch">{t('language.dutch')}</option>
                <option value="french">{t('language.french')}</option>
                <option value="other">{t('language.other')}</option>
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-medium text-text-secondary">{t('explore.filters.tuition')}</span>
              <select
                value={maxTuition}
                onChange={(event) => updateFilters({ maxTuition: event.target.value, tuitionFree: false })}
                disabled={tuitionFreeOnly}
                className="min-h-[42px] w-full rounded-lg border border-border bg-background px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-brand-primary disabled:opacity-50"
              >
                <option value="">{t('explore.filters.anyTuition')}</option>
                <option value="5000">{t('explore.filters.maxTuition', { amount: formatCurrency(5000, i18n.language, 'EUR') })}</option>
                <option value="10000">{t('explore.filters.maxTuition', { amount: formatCurrency(10000, i18n.language, 'EUR') })}</option>
                <option value="20000">{t('explore.filters.maxTuition', { amount: formatCurrency(20000, i18n.language, 'EUR') })}</option>
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-medium text-text-secondary">{t('explore.filters.deadline')}</span>
              <select
                value={deadlineRange}
                onChange={(event) => updateFilters({ deadline: event.target.value })}
                className="min-h-[42px] w-full rounded-lg border border-border bg-background px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-brand-primary"
              >
                <option value="">{t('explore.deadlines.any')}</option>
                <option value="future">{t('explore.deadlines.future')}</option>
                <option value="next3">{t('explore.deadlines.next3')}</option>
                <option value="next6">{t('explore.deadlines.next6')}</option>
              </select>
            </label>

            <label className="flex min-h-[66px] items-end">
              <span className="flex min-h-[42px] w-full cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 transition-colors hover:bg-elevated">
                <input
                  type="checkbox"
                  checked={tuitionFreeOnly}
                  onChange={(event) => updateFilters({ tuitionFree: event.target.checked, maxTuition: '' })}
                  className="h-4 w-4 rounded text-brand-primary focus:ring-brand-primary"
                />
                <span className="text-sm text-text-secondary">{t('explore.filters.tuitionFree')}</span>
              </span>
            </label>
          </div>

          {hasActiveFilters && (
            <div className="mt-4 border-t border-border pt-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  {activeFilters.map((label) => (
                    <span key={label} className="rounded-full bg-brand-primary/10 px-2.5 py-1 text-xs font-medium text-brand-primary">
                      {label}
                    </span>
                  ))}
                </div>
                <button onClick={resetFilters} className="text-sm font-medium text-brand-primary transition-colors hover:text-brand-secondary">
                  {t('explore.clearFilters')}
                </button>
              </div>
            </div>
          )}
        </div>

        {showTooManyResults && (
          <div className="mb-6 rounded-lg border border-status-warning/30 bg-status-warning/10 px-4 py-3 text-sm text-text-secondary">
            <p className="font-medium text-text-primary">{t('explore.tooManyTitle', { count: total })}</p>
            <p className="mt-1">{t('explore.tooManySubtitle')}</p>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => <Skeleton key={item} className="h-64 rounded-xl" />)}
          </div>
        ) : courses.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface px-4 py-16 text-center">
            <h3 className="text-lg font-semibold text-text-primary">{t(hasActiveFilters ? 'explore.emptyFilteredTitle' : 'explore.emptyTitle')}</h3>
            <p className="mx-auto mt-2 max-w-xl text-text-muted">{t(hasActiveFilters ? 'explore.emptyFilteredSubtitle' : 'explore.emptySubtitle')}</p>
            {hasActiveFilters && (
              <button onClick={resetFilters} className="mt-5 rounded-lg bg-brand-primary px-4 py-2 font-medium text-white transition-colors hover:bg-brand-secondary">
                {t('explore.clearFilters')}
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm text-text-muted">{t('explore.showingResults', { count: total })}</p>
              <p className="text-sm text-text-muted">{t('explore.showingOf', { shown: courses.length, total })}</p>
            </div>

            <motion.div
              className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
            >
              {courses.map((course) => {
                const freshness = getFreshnessState(course);
                return (
                  <motion.article
                    key={course.id}
                    variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
                    whileHover={{ y: -2 }}
                    className="flex flex-col rounded-xl border border-border bg-surface p-4 transition-all hover:shadow-[0_4px_16px_rgba(13,115,119,0.10)]"
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <span className={cn(
                        'rounded-full px-2 py-1 text-xs font-medium',
                        course.degree_level === 'master' ? 'bg-brand-primary/10 text-brand-primary' :
                          course.degree_level === 'phd' ? 'bg-brand-secondary/10 text-brand-secondary' :
                            'bg-elevated text-text-secondary'
                      )}>
                        {t(`degree.${course.degree_level}`)}
                      </span>
                      {course.university_ranking_qs && <span className="text-xs text-text-muted">{t('explore.qsRank', { rank: course.university_ranking_qs })}</span>}
                    </div>

                    <Link to={`/courses/${course.id}`} className="mb-1 line-clamp-2 font-semibold text-text-primary hover:text-brand-primary">
                      {course.name}
                    </Link>
                    <p className="mb-1 text-sm text-text-muted">{course.university_name}</p>
                    <p className="mb-3 text-xs text-text-muted">{course.university_city}, {course.university_country}</p>

                    <div className="mb-4 flex flex-1 flex-wrap content-start gap-1.5 text-xs">
                      <span className="rounded-full bg-elevated px-2 py-1 text-text-secondary">{t(`language.${course.teaching_language}`)}</span>
                      {course.is_tuition_free ? (
                        <span className="rounded-full bg-status-success/10 px-2 py-1 text-status-success">{t('explore.badges.tuitionFree')}</span>
                      ) : course.tuition_fee_amount ? (
                        <span className="rounded-full bg-elevated px-2 py-1 text-text-secondary">
                          {formatCurrency(course.tuition_fee_amount, i18n.language, course.tuition_fee_currency ?? 'EUR')} {t('explore.badges.perYear')}
                        </span>
                      ) : null}
                      {course.deadline_fall && (
                        <span className="rounded-full bg-status-warning/10 px-2 py-1 text-status-warning">
                          {t('explore.badges.deadline', { date: formatDate(course.deadline_fall, i18n.language, { month: 'short', day: 'numeric' }) })}
                        </span>
                      )}
                      {course.scholarships_available && <span className="rounded-full bg-brand-accent/10 px-2 py-1 text-brand-accent">{t('explore.badges.scholarships')}</span>}
                    </div>

                    <div className="mb-4 rounded-lg bg-elevated px-3 py-2 text-xs text-text-muted">
                      <div className="flex items-center justify-between gap-3">
                        <span>{t(`explore.freshness.${freshness.key}`)}</span>
                        {freshness.date && <span>{formatDate(freshness.date, i18n.language, { year: 'numeric', month: 'short', day: 'numeric' })}</span>}
                      </div>
                      {course.program_url && (
                        <a href={course.program_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-brand-primary hover:text-brand-secondary">
                          {t('explore.officialSource')}
                        </a>
                      )}
                    </div>

                    <div className="mt-auto flex items-center gap-2">
                      <motion.button
                        onClick={() => handleAddToTracker(course.id)}
                        disabled={adding === course.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        className="flex-1 rounded-lg bg-brand-primary py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-secondary disabled:opacity-50"
                      >
                        {adding === course.id ? (
                          <span className="flex items-center justify-center gap-2">
                            <Spinner className="h-4 w-4 border-white border-t-transparent" />
                            {t('explore.adding')}
                          </span>
                        ) : t('explore.addToTracker')}
                      </motion.button>
                      <Link to={`/courses/${course.id}`} className="rounded-lg border border-border px-3 py-2.5 text-sm text-text-secondary hover:bg-elevated">
                        {t('explore.details')}
                      </Link>
                    </div>
                  </motion.article>
                );
              })}
            </motion.div>

            {hasMore && (
              <div className="mt-8 text-center">
                <motion.button
                  onClick={() => searchCourses(true)}
                  disabled={loadingMore}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="rounded-xl border border-border bg-surface px-8 py-3 font-medium text-text-primary transition-colors hover:bg-elevated disabled:opacity-50"
                >
                  {loadingMore ? (
                    <span className="flex items-center justify-center gap-2">
                      <Spinner className="h-4 w-4" />
                      {t('explore.loadingMore')}
                    </span>
                  ) : t('explore.loadMore', { count: Math.min(remainingCount, PAGE_SIZE) })}
                </motion.button>
              </div>
            )}
          </>
        )}
      </div>
    </PageTransition>
  );
}
