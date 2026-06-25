import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { courseApi, trackerApi } from '../../api/services';
import { PageTransition } from '../../components/Transitions/PageTransition';
import { Spinner } from '../../components/Feedback/Spinner';
import { cn } from '../../lib/cn';
import { formatDate } from '../../lib/format';
import type { CourseSummary, Priority, IntakePeriod } from '../../types';

const inputCls = 'block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-none';

export function AddProgramPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState<'search' | 'custom'>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CourseSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CourseSummary | null>(null);

  // Custom entry
  const [customProgram, setCustomProgram] = useState('');
  const [customUniversity, setCustomUniversity] = useState('');
  const [customCountry, setCustomCountry] = useState('');
  const [customDeadline, setCustomDeadline] = useState('');

  // Common fields
  const [priority, setPriority] = useState<Priority>('target');
  const [intake, setIntake] = useState<IntakePeriod | ''>('fall_2025');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [addedProgramName, setAddedProgramName] = useState('');

  // Debounced catalogue search
  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try { setResults(await courseApi.autocomplete(query)); }
      catch { toast.error(t('addProgram.searchError')); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, t]);

  const handleSelectCourse = (course: CourseSummary) => {
    setSelectedCourse(course);
    setQuery('');
    setResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'search' && selectedCourse) {
        await trackerApi.addProgram({ course_id: selectedCourse.id, priority, intake: intake || undefined, notes: notes || undefined });
        setAddedProgramName(selectedCourse.name);
      } else if (mode === 'custom' && customProgram && customUniversity) {
        await trackerApi.addProgram({ custom_program_name: customProgram, custom_university_name: customUniversity, custom_country: customCountry || undefined, custom_deadline: customDeadline || undefined, priority, intake: intake || undefined, notes: notes || undefined });
        setAddedProgramName(customProgram);
      } else {
        setError(t('addProgram.missingDetails'));
        setSubmitting(false);
        return;
      }
      toast.success(t('addProgram.successToast'));
      setShowSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('addProgram.error');
      setError(message);
      toast.error(message);
    } finally { setSubmitting(false); }
  };

  const canSubmit = mode === 'search' ? !!selectedCourse : !!(customProgram && customUniversity);
  const showNoResults = !selectedCourse && query.length > 1 && results.length === 0 && !searching;

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">

        {/* Breadcrumb */}
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-brand-primary hover:text-brand-primary/80 transition-colors mb-6">
          <svg className="w-4 h-4 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
          {t('dashboard.title')}
        </Link>

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary text-balance">{t('addProgram.title')}</h1>
          <p className="mt-1.5 text-sm text-text-secondary">{t('addProgram.subtitle')}</p>
        </div>

        {/* Mode toggle — tabs, not buttons */}
        <div className="flex border border-border rounded-lg overflow-hidden mb-6 bg-elevated">
          {(['search', 'custom'] as const).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                'flex-1 py-2.5 text-sm font-medium transition-colors',
                mode === m ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'
              )}
            >
              {m === 'search' ? t('addProgram.searchMode') : t('addProgram.customMode')}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ── Search mode ── */}
          {mode === 'search' && (
            <div className="rounded-xl border border-border bg-surface p-5">
              <div className="relative">
                <svg className="absolute inset-y-0 start-3 my-auto w-4 h-4 text-text-muted pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <input
                  type="text"
                  value={query}
                  onChange={e => { setQuery(e.target.value); setSelectedCourse(null); }}
                  placeholder={t('addProgram.searchPlaceholder')}
                  aria-label={t('addProgram.searchPlaceholder')}
                  className={cn(inputCls, 'ps-9 pe-9')}
                />
                {searching && (
                  <div className="absolute inset-y-0 end-3 flex items-center pointer-events-none">
                    <Spinner className="h-4 w-4" />
                  </div>
                )}

                {/* Dropdown results */}
                {results.length > 0 && (
                  <div className="absolute z-10 top-full mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-border bg-surface shadow-lg">
                    {results.map(course => (
                      <button
                        key={course.id}
                        type="button"
                        onClick={() => handleSelectCourse(course)}
                        className="w-full px-4 py-3 text-start hover:bg-elevated transition-colors border-b border-border last:border-0"
                      >
                        <p className="text-sm font-medium text-text-primary">{course.name}</p>
                        <p className="text-xs text-text-muted mt-0.5">
                          {course.university_name} · {course.university_country}
                          {course.deadline_fall && (
                            <> · {formatDate(course.deadline_fall, i18n.language, { month: 'short', day: 'numeric', year: 'numeric' })}</>
                          )}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected course confirmation */}
              <AnimatePresence>
                {selectedCourse && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 rounded-lg bg-brand-primary/5 border border-brand-primary/20 px-4 py-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text-primary truncate">{selectedCourse.name}</p>
                      <p className="text-xs text-text-muted mt-0.5">{selectedCourse.university_name} · {selectedCourse.university_country}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCourse(null)}
                      className="text-xs font-medium text-brand-primary hover:text-brand-primary/80 flex-shrink-0 transition-colors"
                    >
                      {t('addProgram.changeProgram')}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Empty state guidance */}
              {query.length === 0 && !selectedCourse && (
                <p className="mt-4 text-center text-xs text-text-muted">{t('addProgram.searchPlaceholder')}</p>
              )}

              {/* No results — with escape hatch to custom */}
              {showNoResults && (
                <div className="mt-3 rounded-lg border border-border bg-elevated p-4 text-center">
                  <p className="text-sm text-text-secondary mb-2">{t('addProgram.noResults')}</p>
                  <button
                    type="button"
                    onClick={() => setMode('custom')}
                    className="text-xs font-medium text-brand-primary hover:text-brand-primary/80 transition-colors"
                  >
                    {t('addProgram.customMode')} →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Custom mode ── */}
          {mode === 'custom' && (
            <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    {t('addProgram.customProgram')} <span className="text-status-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={customProgram}
                    onChange={e => setCustomProgram(e.target.value)}
                    className={inputCls}
                    required={mode === 'custom'}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    {t('addProgram.customUniversity')} <span className="text-status-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={customUniversity}
                    onChange={e => setCustomUniversity(e.target.value)}
                    className={inputCls}
                    required={mode === 'custom'}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    {t('addProgram.customCountry')}
                  </label>
                  <input
                    type="text"
                    value={customCountry}
                    onChange={e => setCustomCountry(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    {t('addProgram.customDeadline')}
                  </label>
                  <input
                    type="date"
                    value={customDeadline}
                    onChange={e => setCustomDeadline(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Common details ── */}
          <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">{t('addProgram.priority')}</label>
                <select value={priority} onChange={e => setPriority(e.target.value as Priority)} className={inputCls}>
                  <option value="dream">{t('priority.dream')}</option>
                  <option value="target">{t('priority.target')}</option>
                  <option value="safety">{t('priority.safety')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">{t('addProgram.intake')}</label>
                <select value={intake} onChange={e => setIntake(e.target.value as IntakePeriod | '')} className={inputCls}>
                  <option value="">{t('addProgram.intake')} — {t('common.unsure', 'not sure yet')}</option>
                  <option value="fall_2025">{t('intake.fall_2025', 'Fall 2025')}</option>
                  <option value="spring_2026">{t('intake.spring_2026', 'Spring 2026')}</option>
                  <option value="fall_2026">{t('intake.fall_2026', 'Fall 2026')}</option>
                  <option value="spring_2027">{t('intake.spring_2027', 'Spring 2027')}</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">{t('addProgram.notes')}</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={t('addProgram.notesPlaceholder')}
                rows={3}
                className={cn(inputCls, 'resize-none')}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-status-danger/30 bg-status-danger/5 px-4 py-3 text-sm text-status-danger">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2.5 text-sm font-medium text-text-secondary border border-border rounded-lg hover:bg-elevated transition-colors"
            >
              {t('common.cancel')}
            </button>
            <motion.button
              type="submit"
              disabled={!canSubmit || submitting}
              whileHover={!canSubmit || submitting ? undefined : { scale: 1.02 }}
              whileTap={!canSubmit || submitting ? undefined : { scale: 0.97 }}
              className="px-6 py-2.5 bg-brand-primary text-white text-sm font-semibold rounded-lg hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Spinner className="h-4 w-4 border-white border-t-transparent" />
                  {t('addProgram.submitting')}
                </span>
              ) : t('addProgram.submit')}
            </motion.button>
          </div>
        </form>
      </div>

      {/* Success overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            className="fixed inset-0 z-80 flex items-center justify-center bg-black/40 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-sm rounded-xl border border-border bg-surface p-6"
            >
              <div className="flex items-start gap-4 mb-5">
                <div className="w-10 h-10 rounded-xl bg-status-success/10 flex items-center justify-center flex-shrink-0" aria-hidden="true">
                  <svg className="w-5 h-5 text-status-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary">{t('addProgram.successTitle')}</h3>
                  <p className="text-sm text-text-secondary mt-1">{t('addProgram.successBody', { name: addedProgramName })}</p>
                </div>
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full py-2.5 bg-brand-primary text-white text-sm font-semibold rounded-lg hover:bg-brand-primary/90 transition-colors"
                >
                  {t('addProgram.goToDashboard')}
                </button>
                <button
                  onClick={() => {
                    setShowSuccess(false);
                    setSelectedCourse(null);
                    setCustomProgram('');
                    setCustomUniversity('');
                    setCustomCountry('');
                    setCustomDeadline('');
                    setNotes('');
                    setQuery('');
                  }}
                  className="w-full py-2.5 border border-border rounded-lg text-sm font-medium text-text-secondary hover:bg-elevated transition-colors"
                >
                  {t('addProgram.addAnother')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
