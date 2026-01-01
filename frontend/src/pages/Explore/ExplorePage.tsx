import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { courseApi, universityApi, trackerApi } from '../../api/services';
import { useAuth } from '../../contexts/AuthContext';
import { PageTransition } from '../../components/Transitions/PageTransition';
import { Skeleton } from '../../components/Feedback/Skeleton';
import { Spinner } from '../../components/Feedback/Spinner';
import { cn } from '../../lib/cn';
import { formatCurrency, formatDate } from '../../lib/format';
import type { Course, DegreeLevel } from '../../types';

export function ExplorePage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { t, i18n } = useTranslation();
  const [courses, setCourses] = useState<Course[]>([]);
  const [countries, setCountries] = useState<Array<{ country: string; count: number }>>([]);
  const [fields, setFields] = useState<Array<{ field: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<number | null>(null);
  
  // Filters
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('');
  const [field, setField] = useState('');
  const [degreeLevel, setDegreeLevel] = useState<DegreeLevel | ''>('');
  const [tuitionFreeOnly, setTuitionFreeOnly] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    searchCourses();
  }, [query, country, field, degreeLevel, tuitionFreeOnly]);

  const loadInitialData = async () => {
    try {
      const [countriesData, fieldsData] = await Promise.all([
        universityApi.getCountries(),
        courseApi.getFields(),
      ]);
      setCountries(countriesData);
      setFields(fieldsData);
    } catch (err) {
      console.error('Failed to load filters:', err);
      toast.error(t('explore.filtersError'));
    }
  };

  const searchCourses = async () => {
    setLoading(true);
    try {
      const data = await courseApi.search({
        query: query || undefined,
        country: country || undefined,
        field: field || undefined,
        degree_level: degreeLevel || undefined,
        tuition_free_only: tuitionFreeOnly,
        limit: 50,
      });
      setCourses(data);
    } catch (err) {
      console.error('Failed to search:', err);
      toast.error(t('explore.searchError'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddToTracker = async (courseId: number) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/explore' } });
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

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">{t('explore.title')}</h1>
        <p className="text-text-muted mt-1">{t('explore.subtitle')}</p>
      </div>

      {/* Filters */}
      <div className="bg-surface rounded-xl border border-border p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('explore.searchPlaceholder')}
            className="px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent bg-background"
          />
          
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent bg-background"
          >
            <option value="">{t('explore.filters.allCountries')}</option>
            {countries.map((c) => (
              <option key={c.country} value={c.country}>
                {c.country} ({c.count})
              </option>
            ))}
          </select>
          
          <select
            value={field}
            onChange={(e) => setField(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent bg-background"
          >
            <option value="">{t('explore.filters.allFields')}</option>
            {fields.map((f) => (
              <option key={f.field} value={f.field}>
                {f.field} ({f.count})
              </option>
            ))}
          </select>
          
          <select
            value={degreeLevel}
            onChange={(e) => setDegreeLevel(e.target.value as DegreeLevel | '')}
            className="px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent bg-background"
          >
            <option value="">{t('explore.filters.allDegrees')}</option>
            <option value="bachelor">{t('degree.bachelor')}</option>
            <option value="master">{t('degree.master')}</option>
            <option value="phd">{t('degree.phd')}</option>
          </select>
          
          <label className="flex items-center gap-2 px-3 py-2">
            <input
              type="checkbox"
              checked={tuitionFreeOnly}
              onChange={(e) => setTuitionFreeOnly(e.target.checked)}
              className="w-4 h-4 text-brand-primary rounded focus:ring-brand-primary"
            />
            <span className="text-sm text-text-secondary">{t('explore.filters.tuitionFree')}</span>
          </label>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-5xl">🔍</span>
          <h3 className="mt-4 text-lg font-medium text-text-primary">{t('explore.emptyTitle')}</h3>
          <p className="mt-2 text-text-muted">{t('explore.emptySubtitle')}</p>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        >
          {courses.map((course) => (
            <motion.div
              key={course.id}
              variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
              whileHover={{ y: -2 }}
              className="bg-surface rounded-xl border border-border p-4 hover:shadow-md transition-shadow"
            >
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
              
              <h3 className="font-semibold text-text-primary mb-1">{course.name}</h3>
              <p className="text-sm text-text-muted mb-3">
                {course.university_name} · {course.university_country}
              </p>
              
              <div className="flex flex-wrap gap-2 mb-4 text-xs">
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
              
              <div className="flex items-center gap-2">
                <motion.button
                  onClick={() => handleAddToTracker(course.id)}
                  disabled={adding === course.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 py-2 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-brand-secondary disabled:opacity-50 transition-colors"
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
                    className="px-3 py-2 border border-border text-text-secondary text-sm rounded-lg hover:bg-elevated"
                  >
                    ↗
                  </motion.a>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
      </div>
    </PageTransition>
  );
}
