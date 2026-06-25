import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { trackerApi } from '../../api/services';
import { PageTransition } from '../../components/Transitions/PageTransition';
import { ProgramCard } from '../../components/Tracker/ProgramCard';
import { Skeleton } from '../../components/Feedback/Skeleton';
import { ConfirmDialog } from '../../components/Feedback/ConfirmDialog';
import { cn } from '../../lib/cn';
import { formatDate, formatNumber } from '../../lib/format';
import type { TrackedProgram, DeadlineItem } from '../../types';

const INITIAL_VISIBLE = 5;

export function DashboardPage() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [programs, setPrograms] = useState<TrackedProgram[]>([]);
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [programPendingDelete, setProgramPendingDelete] = useState<TrackedProgram | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [showAllPrograms, setShowAllPrograms] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [programsData, deadlinesData] = await Promise.all([
        trackerApi.listPrograms(),
        trackerApi.getDeadlines(60),
      ]);
      // Sort by deadline proximity (soonest first, null-deadline last)
      const sorted = [...programsData].sort((a, b) => {
        const da = a.deadline || a.program_deadline;
        const db = b.deadline || b.program_deadline;
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return new Date(da).getTime() - new Date(db).getTime();
      });
      setPrograms(sorted);
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

  const handleDelete = (id: number) => {
    const program = programs.find((item) => item.id === id);
    if (program) setProgramPendingDelete(program);
  };

  const confirmDeleteProgram = async () => {
    if (!programPendingDelete) return;
    setDeleteBusy(true);
    try {
      await trackerApi.deleteProgram(programPendingDelete.id);
      toast.success(t('dashboard.programRemoved'));
      setProgramPendingDelete(null);
      loadData();
    } catch (err) {
      console.error('Failed to delete:', err);
      toast.error(t('dashboard.programRemoveError'));
    } finally {
      setDeleteBusy(false);
    }
  };

  // Document completion across all programs
  const documentStats = useMemo(
    () =>
      programs.reduce(
        (acc, p) => {
          const list = p.document_checklist || [];
          acc.total += list.length;
          acc.done += list.filter((i) => i.completed).length;
          return acc;
        },
        { total: 0, done: 0 }
      ),
    [programs]
  );

  // Next upcoming deadline
  const nextDeadline = useMemo(() => deadlines[0] ?? null, [deadlines]);

  const visiblePrograms = showAllPrograms ? programs : programs.slice(0, INITIAL_VISIBLE);
  const hiddenCount = programs.length - INITIAL_VISIBLE;

  // ── Loading state ──────────────────────────────────────────
  if (loading) {
    return (
      <PageTransition>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <Skeleton className="h-32 rounded-xl" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
              </div>
              <div className="space-y-4">
                <Skeleton className="h-40 rounded-xl" />
                <Skeleton className="h-28 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  // ── Empty state (0 programs) ───────────────────────────────
  if (programs.length === 0) {
    return (
      <PageTransition>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page header */}
          <DashboardHeader user={user} t={t} />

          <div className="mt-12 flex flex-col items-center text-center max-w-md mx-auto py-16">
            <div className="w-14 h-14 rounded-xl bg-brand-primary/10 flex items-center justify-center mb-6" aria-hidden="true">
              <svg className="w-7 h-7 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-text-primary text-balance">{t('dashboard.programs.emptyTitle')}</h2>
            <p className="mt-2 text-text-secondary text-pretty">{t('dashboard.programs.emptyBody')}</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                to="/explore"
                className="inline-flex items-center justify-center px-5 py-2.5 bg-brand-primary text-white font-medium rounded-lg hover:bg-brand-primary/90 transition-colors"
              >
                {t('dashboard.programs.emptyCtaFind')}
              </Link>
              <Link
                to="/dashboard/add"
                className="inline-flex items-center justify-center px-5 py-2.5 border border-border text-text-secondary font-medium rounded-lg hover:bg-elevated hover:text-text-primary transition-colors"
              >
                {t('dashboard.programs.emptyCtaAdd')}
              </Link>
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  // ── Main dashboard ─────────────────────────────────────────
  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Page header */}
        <DashboardHeader user={user} t={t} />

        {/* ── SITUATION ZONE ─────────────────────────────── */}
        <SituationZone
          nextDeadline={nextDeadline}
          programCount={programs.length}
          documentStats={documentStats}
          t={t}
          i18n={i18n}
        />

        {/* ── MAIN + SIDEBAR ─────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Programs list — 2/3 width */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-text-primary">{t('dashboard.programs.title')}</h2>
                <p className="text-xs text-text-muted mt-0.5">{t('dashboard.programs.sortedByDeadline')}</p>
              </div>
              <Link
                to="/dashboard/add"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-primary hover:text-brand-primary/80 transition-colors"
                aria-label={t('dashboard.addProgram')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t('dashboard.addProgram')}
              </Link>
            </div>

            <motion.div
              className="space-y-3"
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
            >
              <AnimatePresence mode="popLayout">
                {visiblePrograms.map((program) => (
                  <motion.div
                    key={program.id}
                    variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
                    exit={{ opacity: 0 }}
                    layout
                  >
                    <ProgramCard
                      program={program}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDelete}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            {/* Show more / less */}
            {programs.length > INITIAL_VISIBLE && (
              <button
                onClick={() => setShowAllPrograms((v) => !v)}
                className="mt-4 w-full py-3 text-sm font-medium text-text-secondary border border-dashed border-border rounded-xl hover:bg-elevated hover:text-text-primary transition-colors"
              >
                {showAllPrograms
                  ? t('dashboard.programs.showLess')
                  : t('dashboard.programs.showMore', { count: hiddenCount })}
              </button>
            )}
          </div>

          {/* Sidebar — 1/3 width */}
          <div className="space-y-5">
            {/* Upcoming deadlines */}
            <div className="rounded-xl border border-border bg-surface p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-status-warning flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('dashboard.deadlines.title')}
              </h3>
              {deadlines.length === 0 ? (
                <p className="text-sm text-text-muted">{t('dashboard.deadlines.empty')}</p>
              ) : (
                <ul className="space-y-3">
                  {deadlines.slice(0, 6).map((item) => (
                    <li key={item.id}>
                      <Link
                        to={`/dashboard/programs/${item.id}`}
                        className="flex items-center justify-between gap-3 group"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate group-hover:text-brand-primary transition-colors">
                            {item.program_name}
                          </p>
                          <p className="text-xs text-text-muted truncate">{item.university_name}</p>
                        </div>
                        <span className={cn(
                          'text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0',
                          item.urgency === 'overdue' || item.urgency === 'today'
                            ? 'bg-status-danger/10 text-status-danger'
                            : item.urgency === 'urgent'
                            ? 'bg-status-warning/10 text-status-warning'
                            : 'bg-elevated text-text-secondary'
                        )}>
                          {item.urgency === 'overdue'
                            ? t('program.deadlineOverdue', { count: Math.abs(item.days_until) })
                            : item.urgency === 'today'
                            ? t('program.deadlineToday')
                            : formatDate(item.deadline, i18n.language, { month: 'short', day: 'numeric' })}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Profile completion nudge — only if incomplete */}
            {!user?.matching_profile_completed && (
              <Link
                to="/recommendations"
                className="block rounded-xl border border-brand-primary/20 bg-brand-primary/5 p-5 hover:bg-brand-primary/10 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-brand-primary flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{t('dashboard.profileCard.title')}</p>
                    <p className="text-xs text-text-secondary mt-1 leading-snug">{t('dashboard.profileCard.body')}</p>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-primary mt-2">
                      {t('dashboard.profileCard.cta')}
                      <svg className="w-3 h-3 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </div>
              </Link>
            )}

            {/* Ghadam balance — only if positive and has spend value */}
            {(user?.ghadam_balance ?? 0) > 0 && (
              <div className="rounded-xl border border-border bg-surface p-5">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-text-primary">{t('dashboard.balance.title')}</p>
                  <span aria-hidden="true" className="text-xl">🪙</span>
                </div>
                <p className="text-2xl font-bold text-brand-primary font-display">
                  {formatNumber(user?.ghadam_balance ?? 0, i18n.language)}
                </p>
                <p className="text-xs text-text-muted mt-1">{t('dashboard.balance.subtitle')}</p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Confirm delete */}
      <ConfirmDialog
        open={Boolean(programPendingDelete)}
        title={t('dashboard.confirmDeleteTitle')}
        description={t('dashboard.confirmDeleteDescription', {
          name: programPendingDelete?.program_name || programPendingDelete?.custom_program_name || t('program.unknown'),
        })}
        confirmLabel={t('common.delete')}
        destructive
        busy={deleteBusy}
        onCancel={() => setProgramPendingDelete(null)}
        onConfirm={confirmDeleteProgram}
      />

      {/* Mobile FAB */}
      <motion.div
        className="md:hidden fixed bottom-6 z-40"
        style={{ insetInlineEnd: '1.25rem' }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Link
          to="/dashboard/add"
          className="inline-flex items-center gap-2 rounded-full bg-brand-primary text-white px-5 py-3 shadow-lg shadow-brand-primary/20"
          aria-label={t('dashboard.addProgram')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-sm font-semibold">{t('dashboard.addProgram')}</span>
        </Link>
      </motion.div>

    </PageTransition>
  );
}

// ── Sub-components ────────────────────────────────────────────

function DashboardHeader({
  user,
  t,
}: {
  user: ReturnType<typeof import('../../contexts/AuthContext').useAuth>['user'];
  t: ReturnType<typeof import('react-i18next').useTranslation>['t'];
}) {
  const name = user?.display_name;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          {name ? t('dashboard.greeting', { name }) : t('dashboard.greetingFallback')}
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <Link
          to="/recommendations"
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-brand-primary/90 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span>{t('dashboard.findPrograms')}</span>
        </Link>
      </div>
    </div>
  );
}

function SituationZone({
  nextDeadline,
  programCount,
  documentStats,
  t,
  i18n,
}: {
  nextDeadline: DeadlineItem | null;
  programCount: number;
  documentStats: { total: number; done: number };
  t: ReturnType<typeof import('react-i18next').useTranslation>['t'];
  i18n: ReturnType<typeof import('react-i18next').useTranslation>['i18n'];
}) {
  const isUrgent =
    nextDeadline !== null &&
    (nextDeadline.urgency === 'overdue' ||
      nextDeadline.urgency === 'today' ||
      nextDeadline.urgency === 'urgent');

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">

        {/* Next deadline — foregrounded */}
        <div className="p-6 sm:col-span-1">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
            {t('dashboard.situation.nextDeadline')}
          </p>
          {nextDeadline ? (
            <Link to={`/dashboard/programs/${nextDeadline.id}`} className="group">
              <div className={cn(
                'text-4xl font-bold font-display tabular-nums leading-none',
                isUrgent ? 'text-status-warning' : 'text-text-primary'
              )}>
                {nextDeadline.urgency === 'overdue'
                  ? t('dashboard.situation.overdue')
                  : nextDeadline.urgency === 'today'
                  ? t('dashboard.situation.today')
                  : t('dashboard.situation.daysLeft', { count: nextDeadline.days_until })}
              </div>
              <p className="mt-2 text-sm font-medium text-text-primary group-hover:text-brand-primary transition-colors truncate">
                {nextDeadline.program_name}
              </p>
              <p className="text-xs text-text-muted">{nextDeadline.university_name}</p>
            </Link>
          ) : (
            <div>
              <p className="text-sm font-medium text-text-muted">{t('dashboard.situation.noDeadlines')}</p>
              <p className="text-xs text-text-muted mt-1">{t('dashboard.situation.noDeadlinesHint')}</p>
            </div>
          )}
        </div>

        {/* Programs tracked */}
        <div className="p-6">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
            {t('dashboard.programs.title')}
          </p>
          <div className="text-3xl font-bold font-display text-text-primary tabular-nums">
            {formatNumber(programCount, i18n.language)}
          </div>
          <p className="text-xs text-text-muted mt-2">
            {t('dashboard.situation.programsTracked', { count: programCount })}
          </p>
        </div>

        {/* Documents */}
        <div className="p-6">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
            {t('dashboard.stats.docsReady', 'Documents')}
          </p>
          {documentStats.total > 0 ? (
            <>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold font-display text-brand-primary tabular-nums">
                  {documentStats.done}
                </span>
                <span className="text-sm text-text-muted">/ {documentStats.total}</span>
              </div>
              <div className="mt-3 h-1.5 bg-elevated rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', documentStats.done === documentStats.total ? 'bg-status-success' : 'bg-brand-primary')}
                  style={{ width: `${Math.round((documentStats.done / documentStats.total) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-text-muted mt-1.5">
                {t('dashboard.situation.docsProgress', { done: documentStats.done, total: documentStats.total })}
              </p>
            </>
          ) : (
            <p className="text-sm text-text-muted">{t('program.noChecklist', '—')}</p>
          )}
        </div>

      </div>
    </div>
  );
}
