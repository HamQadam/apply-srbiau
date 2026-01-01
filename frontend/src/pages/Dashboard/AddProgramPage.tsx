import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { courseApi, trackerApi } from '../../api/services';
import { PageTransition } from '../../components/Transitions/PageTransition';
import { Spinner } from '../../components/Feedback/Spinner';
import { cn } from '../../lib/cn';
import { formatDate } from '../../lib/format';
import type { CourseSummary, Priority, IntakePeriod } from '../../types';

export function AddProgramPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState<'search' | 'custom'>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CourseSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CourseSummary | null>(null);
  
  // Custom entry fields
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
  
  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const courses = await courseApi.autocomplete(query);
        setResults(courses);
      } catch (err) {
        console.error('Search failed:', err);
        toast.error(t('addProgram.searchError'));
      } finally {
        setSearching(false);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [query]);
  
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
        await trackerApi.addProgram({
          course_id: selectedCourse.id,
          priority,
          intake: intake || undefined,
          notes: notes || undefined,
        });
        setAddedProgramName(selectedCourse.name);
      } else if (mode === 'custom' && customProgram && customUniversity) {
        await trackerApi.addProgram({
          custom_program_name: customProgram,
          custom_university_name: customUniversity,
          custom_country: customCountry || undefined,
          custom_deadline: customDeadline || undefined,
          priority,
          intake: intake || undefined,
          notes: notes || undefined,
        });
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
    } finally {
      setSubmitting(false);
    }
  };
  
  const canSubmit = mode === 'search' 
    ? !!selectedCourse 
    : (customProgram && customUniversity);
  
  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">{t('addProgram.title')}</h1>
        <p className="text-text-muted mt-1">
          {t('addProgram.subtitle')}
        </p>
      </div>
      
      {/* Mode Toggle */}
      <div className="flex gap-2 mb-6">
        <motion.button
          onClick={() => setMode('search')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className={cn(
            'px-4 py-2 rounded-lg font-medium transition-colors',
            mode === 'search'
              ? 'bg-brand-primary text-white'
              : 'bg-elevated text-text-secondary hover:bg-elevated/80'
          )}
        >
          {t('addProgram.searchMode')}
        </motion.button>
        <motion.button
          onClick={() => setMode('custom')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className={cn(
            'px-4 py-2 rounded-lg font-medium transition-colors',
            mode === 'custom'
              ? 'bg-brand-primary text-white'
              : 'bg-elevated text-text-secondary hover:bg-elevated/80'
          )}
        >
          {t('addProgram.customMode')}
        </motion.button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {mode === 'search' ? (
          <div className="bg-surface rounded-xl border border-border p-6">
            <h2 className="font-semibold text-text-primary mb-4">{t('addProgram.findProgram')}</h2>
            
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('addProgram.searchPlaceholder')}
                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent bg-background"
              />
              {searching && (
                <div className="absolute right-3 top-3">
                  <Spinner className="h-5 w-5" />
                </div>
              )}
              
              {/* Search Results Dropdown */}
              {results.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-surface border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {results.map((course) => (
                    <motion.button
                      key={course.id}
                      type="button"
                      onClick={() => handleSelectCourse(course)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full px-4 py-3 text-start hover:bg-elevated border-b border-border last:border-0"
                    >
                      <div className="font-medium text-text-primary">{course.name}</div>
                      <div className="text-sm text-text-muted">
                        {course.university_name} · {course.university_country}
                        {course.deadline_fall && (
                          <span className="text-text-muted/70">
                            {' '}· {t('addProgram.deadline')} {formatDate(course.deadline_fall, i18n.language, { year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Selected Course */}
            {selectedCourse && (
              <div className="mt-4 p-4 bg-brand-primary/10 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-text-primary">{selectedCourse.name}</div>
                    <div className="text-sm text-text-secondary">
                      {selectedCourse.university_name} · {selectedCourse.university_country}
                    </div>
                  </div>
                  <motion.button
                    type="button"
                    onClick={() => setSelectedCourse(null)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="text-brand-primary hover:text-brand-secondary"
                  >
                    {t('addProgram.change')}
                  </motion.button>
                </div>
              </div>
            )}
            
            {!selectedCourse && query.length === 0 && (
              <p className="mt-4 text-sm text-text-muted text-center">
                {t('addProgram.startTyping')}
              </p>
            )}

            {!selectedCourse && query.length > 1 && results.length === 0 && !searching && (
              <div className="mt-4 rounded-lg border border-border bg-elevated p-4 text-center">
                <p className="text-sm text-text-secondary mb-3">{t('addProgram.noResults')}</p>
                <motion.button
                  type="button"
                  onClick={() => setMode('custom')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="text-sm font-medium text-brand-primary hover:text-brand-secondary"
                >
                  {t('addProgram.switchToCustom')}
                </motion.button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-surface rounded-xl border border-border p-6">
            <h2 className="font-semibold text-text-primary mb-4">{t('addProgram.customTitle')}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {t('addProgram.programName')}
                </label>
                <input
                  type="text"
                  value={customProgram}
                  onChange={(e) => setCustomProgram(e.target.value)}
                  placeholder={t('addProgram.programPlaceholder')}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent bg-background"
                  required={mode === 'custom'}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {t('addProgram.universityName')}
                </label>
                <input
                  type="text"
                  value={customUniversity}
                  onChange={(e) => setCustomUniversity(e.target.value)}
                  placeholder={t('addProgram.universityPlaceholder')}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent bg-background"
                  required={mode === 'custom'}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    {t('addProgram.country')}
                  </label>
                  <input
                    type="text"
                    value={customCountry}
                    onChange={(e) => setCustomCountry(e.target.value)}
                    placeholder={t('addProgram.countryPlaceholder')}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent bg-background"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    {t('addProgram.deadline')}
                  </label>
                  <input
                    type="date"
                    value={customDeadline}
                    onChange={(e) => setCustomDeadline(e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent bg-background"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Common Fields */}
        <div className="bg-surface rounded-xl border border-border p-6">
          <h2 className="font-semibold text-text-primary mb-4">{t('addProgram.detailsTitle')}</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {t('addProgram.priority')}
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent bg-background"
                >
                  <option value="dream">{t('priority.dream')}</option>
                  <option value="target">{t('priority.target')}</option>
                  <option value="safety">{t('priority.safety')}</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {t('addProgram.intake')}
                </label>
                <select
                  value={intake}
                  onChange={(e) => setIntake(e.target.value as IntakePeriod | '')}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent bg-background"
                >
                  <option value="">{t('addProgram.intakeUnsure')}</option>
                  <option value="fall_2025">{t('intake.fall_2025')}</option>
                  <option value="spring_2026">{t('intake.spring_2026')}</option>
                  <option value="fall_2026">{t('intake.fall_2026')}</option>
                  <option value="spring_2027">{t('intake.spring_2027')}</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                {t('addProgram.notesLabel')}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('addProgram.notesPlaceholder')}
                rows={3}
                className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent resize-none bg-background"
              />
            </div>
          </div>
        </div>
        
        {/* Error */}
        {error && (
          <div className="p-4 bg-status-danger/10 text-status-danger rounded-lg text-sm">
            {error}
          </div>
        )}
        
        {/* Actions */}
        <div className="flex justify-end gap-4">
          <motion.button
            type="button"
            onClick={() => navigate('/dashboard')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="px-6 py-2 text-text-secondary font-medium hover:text-text-primary"
          >
            {t('addProgram.cancel')}
          </motion.button>
          <motion.button
            type="submit"
            disabled={!canSubmit || submitting}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="px-6 py-2 bg-brand-primary text-white font-medium rounded-lg hover:bg-brand-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <Spinner className="h-4 w-4 border-white border-t-transparent" />
                {t('addProgram.adding')}
              </span>
            ) : (
              t('addProgram.submit')
            )}
          </motion.button>
        </div>
      </form>
      </div>

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-background/50 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md rounded-2xl bg-surface border border-border p-6 shadow-xl"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center text-2xl">
                  🎉
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">
                    {t('addProgram.successTitle', { name: addedProgramName })}
                  </h3>
                  <p className="text-sm text-text-muted mt-1">{t('addProgram.successSubtitle')}</p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="rounded-xl border border-border bg-elevated p-3 text-sm text-text-secondary">
                  {t('addProgram.nextSteps')}
                </div>
                <div className="flex flex-col gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate('/dashboard')}
                    className="w-full rounded-xl bg-brand-primary text-white py-2.5 font-medium"
                  >
                    {t('addProgram.goDashboard')}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      setShowSuccess(false);
                      navigate('/dashboard');
                    }}
                    className="w-full rounded-xl border border-border py-2.5 text-text-secondary"
                  >
                    {t('addProgram.setReminder')}
                  </motion.button>
                  <motion.button
                    onClick={() => setShowSuccess(false)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="text-xs text-text-muted hover:text-text-primary"
                  >
                    {t('addProgram.closeModal')}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
