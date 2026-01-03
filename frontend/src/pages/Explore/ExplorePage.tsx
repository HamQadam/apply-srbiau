import { motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { courseApi, universityApi, trackerApi } from '../../api/services';
import { useAuth } from '../../contexts/AuthContext';
import { PageTransition } from '../../components/Transitions/PageTransition';
import { MultiSelectCombobox } from '../../components/Form/MultiSelectCombobox';
import { Skeleton } from '../../components/Feedback/Skeleton';
import { Spinner } from '../../components/Feedback/Spinner';
import { cn } from '../../lib/cn';
import { formatCurrency, formatDate } from '../../lib/format';
import type { Course, DegreeLevel } from '../../types';

const PAGE_SIZE = 24;

export function ExplorePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { t, i18n } = useTranslation();
  
  // Data state
  const [courses, setCourses] = useState<Course[]>([]);
  const [total, setTotal] = useState(0);
  const [countries, setCountries] = useState<Array<{ country: string; count: number }>>([]);
  const [fields, setFields] = useState<Array<{ field: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [adding, setAdding] = useState<number | null>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  
  // Read filters from URL
  const query = searchParams.get('q') || '';
  const selectedCountries = useMemo(() => {
    const c = searchParams.getAll('countries');
    return c.length > 0 ? c : [];
  }, [searchParams]);
  const selectedFields = useMemo(() => {
    const f = searchParams.getAll('fields');
    return f.length > 0 ? f : [];
  }, [searchParams]);
  const degreeLevel = (searchParams.get('degree') || '') as DegreeLevel | '';
  const tuitionFreeOnly = searchParams.get('tuitionFree') === 'true';

  // Update URL when filters change
  const updateFilters = useCallback((updates: {
    q?: string;
    countries?: string[];
    fields?: string[];
    degree?: string;
    tuitionFree?: boolean;
  }) => {
    const newParams = new URLSearchParams(searchParams);
    
    // Handle each parameter
    if (updates.q !== undefined) {
      if (updates.q) newParams.set('q', updates.q);
      else newParams.delete('q');
    }
    
    if (updates.countries !== undefined) {
      newParams.delete('countries');
      updates.countries.forEach((c) => newParams.append('countries', c));
    }
    
    if (updates.fields !== undefined) {
      newParams.delete('fields');
      updates.fields.forEach((f) => newParams.append('fields', f));
    }
    
    if (updates.degree !== undefined) {
      if (updates.degree) newParams.set('degree', updates.degree);
      else newParams.delete('degree');
    }
    
    if (updates.tuitionFree !== undefined) {
      if (updates.tuitionFree) newParams.set('tuitionFree', 'true');
      else newParams.delete('tuitionFree');
    }
    
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Load filter options on mount
  useEffect(() => {
    loadFilterOptions();
  }, []);

  // Search when filters change
  useEffect(() => {
    if (initialLoadDone) {
      searchCourses(false);
    }
  }, [query, selectedCountries, selectedFields, degreeLevel, tuitionFreeOnly, initialLoadDone]);

  const loadFilterOptions = async () => {
    try {
      const [countriesData, fieldsData] = await Promise.all([
        universityApi.getCountries(),
        courseApi.getFields(5), // Only fields with 5+ programs
      ]);
      setCountries(countriesData);
      setFields(fieldsData);
      setInitialLoadDone(true);
    } catch (err) {
      console.error('Failed to load filters:', err);
      toast.error(t('explore.filtersError'));
      setInitialLoadDone(true);
    }
  };

  const searchCourses = async (append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    
    try {
      const offset = append ? courses.length : 0;
      const data = await courseApi.search({
        query: query || undefined,
        countries: selectedCountries.length > 0 ? selectedCountries : undefined,
        fields: selectedFields.length > 0 ? selectedFields : undefined,
        degree_level: degreeLevel || undefined,
        tuition_free_only: tuitionFreeOnly,
        limit: PAGE_SIZE,
        offset,
      });
      
      if (append) {
        setCourses((prev) => [...prev, ...data.courses]);
      } else {
        setCourses(data.courses);
      }
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to search:', err);
      toast.error(t('explore.searchError'));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    searchCourses(true);
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

  // Debounced search input
  const [searchInput, setSearchInput] = useState(query);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== query) {
        updateFilters({ q: searchInput });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Sync search input with URL
  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  // Prepare options for comboboxes
  const countryOptions = useMemo(() => 
    countries.map((c) => ({
      value: c.country,
      label: c.country,
      count: c.count,
    })),
  [countries]);

  const fieldOptions = useMemo(() => 
    fields.map((f) => ({
      value: f.field,
      label: f.field,
      count: f.count,
    })),
  [fields]);

  const hasMore = courses.length < total;
  const remainingCount = total - courses.length;
  const hasActiveFilters = selectedCountries.length > 0 || selectedFields.length > 0 || degreeLevel || tuitionFreeOnly || query;

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary">{t('explore.title')}</h1>
          <p className="text-text-muted mt-1">{t('explore.subtitle')}</p>
        </div>

        {/* Filters */}
        <div className="bg-surface rounded-xl border border-border p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search input */}
            <div className="lg:col-span-1">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('explore.searchPlaceholder')}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent bg-background"
              />
            </div>
            
            {/* Countries multi-select */}
            <div className="lg:col-span-1">
              <MultiSelectCombobox
                options={countryOptions}
                selected={selectedCountries}
                onChange={(countries: string[]) => updateFilters({ countries })}
                placeholder={t('explore.filters.allCountries')}
                searchPlaceholder={t('explore.filters.searchCountries')}
                emptyMessage={t('explore.filters.noCountries')}
              />
            </div>
            
            {/* Fields multi-select */}
            <div className="lg:col-span-1">
              <MultiSelectCombobox
                options={fieldOptions}
                selected={selectedFields}
                onChange={(fields: string[]) => updateFilters({ fields })}
                placeholder={t('explore.filters.allFields')}
                searchPlaceholder={t('explore.filters.searchFields')}
                emptyMessage={t('explore.filters.noFields')}
                maxSelections={5}
              />
            </div>
            
            {/* Degree level */}
            <div className="lg:col-span-1">
              <select
                value={degreeLevel}
                onChange={(e) => updateFilters({ degree: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent bg-background min-h-[42px]"
              >
                <option value="">{t('explore.filters.allDegrees')}</option>
                <option value="bachelor">{t('degree.bachelor')}</option>
                <option value="master">{t('degree.master')}</option>
                <option value="phd">{t('degree.phd')}</option>
              </select>
            </div>
            
            {/* Tuition-free checkbox */}
            <div className="lg:col-span-1">
              <label className="flex items-center gap-2 px-3 py-2 h-full min-h-[42px] bg-background border border-border rounded-lg cursor-pointer hover:bg-elevated transition-colors">
                <input
                  type="checkbox"
                  checked={tuitionFreeOnly}
                  onChange={(e) => updateFilters({ tuitionFree: e.target.checked })}
                  className="w-4 h-4 text-brand-primary rounded focus:ring-brand-primary"
                />
                <span className="text-sm text-text-secondary">{t('explore.filters.tuitionFree')}</span>
              </label>
            </div>
          </div>
          
          {/* Active filters summary & clear */}
          {hasActiveFilters && (
            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
              <div className="text-sm text-text-muted">
                {t('explore.showingResults', { count: total })}
              </div>
              <button
                onClick={() => {
                  setSearchParams(new URLSearchParams());
                  setSearchInput('');
                }}
                className="text-sm text-brand-primary hover:text-brand-secondary transition-colors"
              >
                {t('explore.clearFilters')}
              </button>
            </div>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-52 rounded-xl" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-5xl">🔍</span>
            <h3 className="mt-4 text-lg font-medium text-text-primary">{t('explore.emptyTitle')}</h3>
            <p className="mt-2 text-text-muted">{t('explore.emptySubtitle')}</p>
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setSearchParams(new URLSearchParams());
                  setSearchInput('');
                }}
                className="mt-4 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-secondary transition-colors"
              >
                {t('explore.clearFilters')}
              </button>
            )}
          </div>
        ) : (
          <>
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
            >
              {courses.map((course) => (
                <motion.div
                  key={course.id}
                  variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
                  whileHover={{ y: -2 }}
                  className="bg-surface rounded-xl border border-border p-4 hover:shadow-md transition-shadow flex flex-col"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <span className={cn(
                      'text-xs font-medium px-2 py-1 rounded-full',
                      course.degree_level === 'master'
                        ? 'bg-brand-primary/10 text-brand-primary'
                        : course.degree_level === 'phd'
                        ? 'bg-brand-secondary/10 text-brand-secondary'
                        : 'bg-elevated text-text-secondary'
                    )}>
                      {t(`degree.${course.degree_level}`)}
                    </span>
                    {course.university_ranking_qs && (
                      <span className="text-xs text-text-muted">{t('explore.qsRank', { rank: course.university_ranking_qs })}</span>
                    )}
                  </div>
                  
                  {/* Program info */}
                  <h3 className="font-semibold text-text-primary mb-1 line-clamp-2">{course.name}</h3>
                  <p className="text-sm text-text-muted mb-1">
                    {course.university_name}
                  </p>
                  <p className="text-xs text-text-muted mb-3">
                    📍 {course.university_city}, {course.university_country}
                  </p>
                  
                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5 mb-4 text-xs flex-1">
                    {course.is_tuition_free ? (
                      <span className="px-2 py-1 bg-status-success/10 text-status-success rounded-full">
                        {t('explore.badges.tuitionFree')}
                      </span>
                    ) : course.tuition_fee_amount ? (
                      <span className="px-2 py-1 bg-elevated text-text-secondary rounded-full">
                        {formatCurrency(
                          course.tuition_fee_amount,
                          i18n.language,
                          course.tuition_fee_currency ?? 'EUR'
                        )}{' '}
                        {t('explore.badges.perYear')}
                      </span>
                    ) : null}
                    
                    {course.deadline_fall && (
                      <span className="px-2 py-1 bg-status-warning/10 text-status-warning rounded-full">
                        {t('explore.badges.deadline', {
                          date: formatDate(course.deadline_fall, i18n.language, { month: 'short', day: 'numeric' }),
                        })}
                      </span>
                    )}
                    
                    {course.scholarships_available && (
                      <span className="px-2 py-1 bg-brand-accent/10 text-brand-accent rounded-full">
                        {t('explore.badges.scholarships')}
                      </span>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-auto">
                    <motion.button
                      onClick={() => handleAddToTracker(course.id)}
                      disabled={adding === course.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className="flex-1 py-2.5 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-brand-secondary disabled:opacity-50 transition-colors"
                    >
                      {adding === course.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <Spinner className="h-4 w-4 border-white border-t-transparent" />
                          {t('explore.adding')}
                        </span>
                      ) : (
                        t('explore.addToTracker')
                      )}
                    </motion.button>
                    {course.program_url && (
                      <motion.a
                        href={course.program_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.97 }}
                        className="px-3 py-2.5 border border-border text-text-secondary text-sm rounded-lg hover:bg-elevated"
                        title={t('explore.viewProgram')}
                      >
                        ↗
                      </motion.a>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
            
            {/* Load more */}
            {hasMore && (
              <div className="mt-8 text-center">
                <motion.button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-8 py-3 bg-surface border border-border text-text-primary font-medium rounded-xl hover:bg-elevated disabled:opacity-50 transition-colors"
                >
                  {loadingMore ? (
                    <span className="flex items-center justify-center gap-2">
                      <Spinner className="h-4 w-4" />
                      {t('explore.loadingMore')}
                    </span>
                  ) : (
                    t('explore.loadMore', { count: Math.min(remainingCount, PAGE_SIZE) })
                  )}
                </motion.button>
                <p className="mt-2 text-sm text-text-muted">
                  {t('explore.showingOf', { shown: courses.length, total })}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </PageTransition>
  );
}