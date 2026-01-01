import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { trackerApi } from '../../api/services';
import { PageTransition } from '../../components/Transitions/PageTransition';
import { ProgramCard } from '../../components/Tracker/ProgramCard';
import { DeadlineList } from '../../components/Tracker/DeadlineList';
import { Skeleton } from '../../components/Feedback/Skeleton';
import { cn } from '../../lib/cn';
import { formatNumber } from '../../lib/format';
import type { TrackedProgram, TrackerStats, DeadlineItem } from '../../types';

export function DashboardPage() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [programs, setPrograms] = useState<TrackedProgram[]>([]);
  const [stats, setStats] = useState<TrackerStats | null>(null);
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      const [programsData, statsData, deadlinesData] = await Promise.all([
        trackerApi.listPrograms(),
        trackerApi.getStats(),
        trackerApi.getDeadlines(30),
      ]);
      setPrograms(programsData);
      setStats(statsData);
      setDeadlines(deadlinesData);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      toast.error(t('dashboard.loadError'));
    } finally {
      setLoading(false);
    }
  };
  
  const handleStatusChange = async (id: number, status: string) => {
    try {
      await trackerApi.updateProgram(id, { status: status as TrackedProgram['status'] });
      toast.success(t('dashboard.statusUpdated'));
      loadData();
    } catch (err) {
      console.error('Failed to update status:', err);
      toast.error(t('dashboard.statusUpdateError'));
    }
  };
  
  const handleDelete = async (id: number) => {
    if (!confirm(t('dashboard.confirmRemove'))) return;
    try {
      await trackerApi.deleteProgram(id);
      toast.success(t('dashboard.programRemoved'));
      loadData();
    } catch (err) {
      console.error('Failed to delete:', err);
      toast.error(t('dashboard.programRemoveError'));
    }
  };
  
  // Calculate document stats
  const documentStats = programs.reduce((acc, program) => {
    const checklist = program.document_checklist || [];
    acc.total += checklist.length;
    acc.completed += checklist.filter(item => item.completed).length;
    return acc;
  }, { total: 0, completed: 0 });
  
  const documentProgress = documentStats.total > 0 
    ? Math.round((documentStats.completed / documentStats.total) * 100) 
    : 0;
  
  if (loading) {
    return (
      <PageTransition>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="space-y-4">
            <Skeleton className="h-8 w-1/3" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }
  
  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {user?.display_name
              ? t('dashboard.greeting', { name: user.display_name })
              : t('dashboard.title')}
          </h1>
          <p className="text-text-muted mt-1">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
            <Link
            to="/recommendations"
            className="px-4 py-2 bg-gradient-to-r from-brand-secondary to-brand-primary text-white font-medium rounded-xl hover:from-brand-primary hover:to-brand-secondary transition-all shadow-sm flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span>{t('dashboard.findPrograms')}</span>
          </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
            <Link
            to="/dashboard/add"
            className="px-4 py-2 bg-brand-primary text-white font-medium rounded-xl hover:bg-brand-secondary transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>{t('dashboard.addProgram')}</span>
          </Link>
          </motion.div>
        </div>
      </div>
      
      {/* Stats Cards */}
      {stats && (
        <div className="flex gap-4 overflow-x-auto pb-2 mb-8 md:grid md:grid-cols-5 md:overflow-visible">
          <motion.div whileHover={{ y: -2 }} className="min-w-[160px] bg-surface rounded-2xl border border-border p-4 shadow-sm">
            <div className="text-2xl font-bold text-text-primary">{formatNumber(stats.total_programs, i18n.language)}</div>
            <div className="text-sm text-text-muted">{t('dashboard.stats.totalPrograms')}</div>
          </motion.div>
          <motion.div whileHover={{ y: -2 }} className="min-w-[160px] bg-surface rounded-2xl border border-border p-4 shadow-sm">
            <div className="text-2xl font-bold text-status-success">{formatNumber(stats.accepted_count, i18n.language)}</div>
            <div className="text-sm text-text-muted">{t('dashboard.stats.accepted')}</div>
          </motion.div>
          <motion.div whileHover={{ y: -2 }} className="min-w-[160px] bg-surface rounded-2xl border border-border p-4 shadow-sm">
            <div className="text-2xl font-bold text-status-warning">{formatNumber(stats.pending_count, i18n.language)}</div>
            <div className="text-sm text-text-muted">{t('dashboard.stats.pending')}</div>
          </motion.div>
          <motion.div whileHover={{ y: -2 }} className="min-w-[160px] bg-surface rounded-2xl border border-border p-4 shadow-sm">
            <div className="text-2xl font-bold text-status-danger">{formatNumber(stats.upcoming_deadlines, i18n.language)}</div>
            <div className="text-sm text-text-muted">{t('dashboard.stats.deadlinesSoon')}</div>
          </motion.div>
          {/* Document Progress */}
          <motion.div whileHover={{ y: -2 }} className="min-w-[160px] bg-surface rounded-2xl border border-border p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <div className="text-2xl font-bold text-brand-primary">{documentProgress}%</div>
              <span className="text-xs text-text-muted">
                {documentStats.completed}/{documentStats.total}
              </span>
            </div>
            <div className="text-sm text-text-muted mb-2">{t('dashboard.stats.docsReady')}</div>
            <div className="w-full h-1.5 bg-elevated rounded-full overflow-hidden">
              <div 
                className={cn(
                  'h-full rounded-full transition-all',
                  documentProgress === 100
                    ? 'bg-gradient-to-r from-status-success to-brand-accent'
                    : 'bg-gradient-to-r from-brand-primary to-brand-secondary'
                )}
                style={{ width: `${documentProgress}%` }}
              />
            </div>
          </motion.div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Programs List */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary">{t('dashboard.programs.title')}</h2>
            {programs.length > 0 && (
              <span className="text-sm text-text-muted">
                {t('dashboard.programs.count', { count: programs.length })}
              </span>
            )}
          </div>
          
          {programs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface rounded-2xl border border-border p-8 text-center shadow-sm"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-brand-primary/10 to-brand-secondary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📝</span>
              </div>
              <h3 className="text-lg font-medium text-text-primary">{t('dashboard.programs.emptyTitle')}</h3>
              <p className="mt-2 text-text-muted max-w-sm mx-auto">
                {t('dashboard.programs.emptySubtitle')}
              </p>
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <Link
                  to="/recommendations"
                  className="px-4 py-2 bg-gradient-to-r from-brand-secondary to-brand-primary text-white font-medium rounded-xl hover:from-brand-primary hover:to-brand-secondary transition-all"
                >
                  {t('dashboard.programs.findMatching')}
                </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <Link
                  to="/dashboard/add"
                  className="px-4 py-2 text-brand-primary font-medium hover:text-brand-secondary"
                >
                  {t('dashboard.programs.addManual')}
                </Link>
                </motion.div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              className="space-y-4"
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
            >
              {programs.map((program) => (
                <motion.div key={program.id} variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>
                  <ProgramCard
                    program={program}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Deadlines */}
          <div className="bg-surface rounded-2xl border border-border p-5 shadow-sm">
            <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-status-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t('dashboard.deadlines.title')}
            </h3>
            <DeadlineList deadlines={deadlines} />
          </div>
          
          {/* Profile Match Card */}
          {!user?.matching_profile_completed && (
            <Link 
              to="/recommendations"
              className="block bg-gradient-to-br from-brand-secondary/10 to-brand-primary/10 rounded-2xl p-5 border border-brand-secondary/20 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-brand-secondary to-brand-primary rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary">{t('dashboard.profileCard.title')}</h3>
                  <p className="text-sm text-text-secondary mt-1">
                    {t('dashboard.profileCard.subtitle')}
                  </p>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-primary mt-2">
                    {t('dashboard.profileCard.cta')}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </div>
            </Link>
          )}
          
          {/* Ghadam Balance */}
          <div className="bg-gradient-to-br from-brand-accent/10 to-status-warning/10 rounded-2xl p-5 border border-brand-accent/20">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-text-primary">{t('dashboard.balance.title')}</h3>
              <span className="text-2xl">🪙</span>
            </div>
            <div className="text-3xl font-bold text-brand-accent">
              {user?.ghadam_balance || 0}
            </div>
            <p className="text-sm text-text-secondary mt-1">
              {t('dashboard.balance.subtitle')}
            </p>
          </div>
          
          {/* Quick Tips */}
          <div className="bg-gradient-to-br from-brand-primary/10 to-brand-secondary/10 rounded-2xl p-5 border border-brand-primary/20">
            <h3 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
              💡 {t('dashboard.tips.title')}
            </h3>
            <ul className="text-sm text-text-secondary space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-brand-primary">•</span>
                <span>{t('dashboard.tips.first')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-primary">•</span>
                <span>{t('dashboard.tips.second')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-primary">•</span>
                <span>{t('dashboard.tips.third')}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <motion.div
        className="md:hidden fixed bottom-6 z-40"
        style={{ insetInlineEnd: '1rem' }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Link
          to="/dashboard/add"
          className="inline-flex items-center gap-2 rounded-full bg-brand-primary text-white px-5 py-3 shadow-lg shadow-brand-primary/20"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-sm font-semibold">{t('dashboard.addProgram')}</span>
        </Link>
      </motion.div>
    </div>
    </PageTransition>
  );
}
