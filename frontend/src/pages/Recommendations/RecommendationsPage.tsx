import { motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { matchingApi } from '../../api/services';
import { ProfileWizard } from '../../components/Matching/ProfileWizard';
import { PageTransition } from '../../components/Transitions/PageTransition';
import { Skeleton } from '../../components/Feedback/Skeleton';
import { Spinner } from '../../components/Feedback/Spinner';
import type { Recommendation, MatchingProfile, RecommendationsResponse } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../lib/format';
import { cn } from '../../lib/cn';

// Score ring drawn as SVG — no gradient, semantically coloured
function ScoreRing({ score }: { score: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color =
    score >= 80 ? 'var(--color-success)' :
    score >= 60 ? 'var(--color-teal)' :
    score >= 40 ? 'var(--color-warning)' :
    'var(--color-muted)';

  return (
    <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true" className="flex-shrink-0">
      <style>{`
        .score-ring { --color-teal: rgb(13 115 119); --color-success: rgb(16 185 129); --color-warning: rgb(245 158 11); --color-muted: rgb(107 114 128); }
      `}</style>
      <g className="score-ring">
        <circle cx="36" cy="36" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-elevated" />
        <circle
          cx="36" cy="36" r={r} fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={`${filled} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
          style={{ transition: 'stroke-dasharray 0.5s ease-out' }}
        />
        <text x="36" y="36" textAnchor="middle" dominantBaseline="central"
          fontSize="14" fontWeight="700" fill={color}>
          {score}
        </text>
      </g>
    </svg>
  );
}

export const RecommendationsPage: React.FC = () => {
  const { refreshUser } = useAuth();
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [total, setTotal] = useState(0);
  const [profileSummary, setProfileSummary] = useState<RecommendationsResponse['profile_summary'] | null>(null);
  const [refinementPrompts, setRefinementPrompts] = useState<RecommendationsResponse['refinement_prompts']>([]);
  const [resultThreshold, setResultThreshold] = useState<RecommendationsResponse['result_threshold'] | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [tracking, setTracking] = useState<number | null>(null);
  const [offset, setOffset] = useState(0);
  const limit = 12;

  useEffect(() => { checkProfileAndLoad(); }, []);

  const checkProfileAndLoad = async () => {
    try {
      const profileData = await matchingApi.getProfile();
      if (!profileData.completed) { setShowWizard(true); setLoading(false); return; }
      await loadRecommendations();
    } catch (err) {
      console.error('Error loading profile:', err);
      toast.error(t('recommendations.profileError'));
      setLoading(false);
    }
  };

  const loadRecommendations = async (newOffset = 0) => {
    setLoading(true);
    try {
      const data = await matchingApi.getRecommendations({ limit, offset: newOffset });
      setRecommendations(newOffset === 0 ? data.recommendations : prev => [...prev, ...data.recommendations]);
      setTotal(data.total);
      setProfileSummary(data.profile_summary);
      setRefinementPrompts(data.refinement_prompts || []);
      setResultThreshold(data.result_threshold || null);
      setOffset(newOffset);
    } catch (err) {
      console.error('Error loading recommendations:', err);
      toast.error(t('recommendations.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleWizardComplete = async (_profile: MatchingProfile, bonusAwarded: number) => {
    setShowWizard(false);
    if (bonusAwarded > 0) { await refreshUser(); toast.success(t('recommendations.bonusEarned', { amount: bonusAwarded })); }
    await loadRecommendations();
  };

  const handleTrack = async (courseId: number) => {
    setTracking(courseId);
    try {
      await matchingApi.trackRecommendation(courseId, 'target');
      toast.success(t('recommendations.tracked'));
      setRecommendations(prev => prev.filter(r => r.id !== courseId));
      setTotal(prev => prev - 1);
    } catch (err: any) {
      toast.error(err?.message?.includes('already') ? t('recommendations.alreadyTracked') : t('recommendations.trackError'));
    } finally {
      setTracking(null);
    }
  };

  // ── Wizard view ──────────────────────────────────────────
  if (showWizard) {
    return (
      <PageTransition>
        <div className="min-h-[calc(100vh-4rem)] bg-background">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
            <div className="mb-10">
              <h1 className="text-2xl font-bold text-text-primary text-balance">
                {t('recommendations.wizardTitle')}
              </h1>
              <p className="mt-2 text-text-secondary">{t('recommendations.wizardSubtitle')}</p>
            </div>
            <ProfileWizard onComplete={handleWizardComplete} />
          </div>
        </div>
      </PageTransition>
    );
  }

  // ── Main view ────────────────────────────────────────────
  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{t('recommendations.title')}</h1>
            <p className="mt-1 text-text-secondary text-sm">
              {t('recommendations.subtitle', { count: total })}
            </p>
          </div>
          <button
            onClick={() => setShowWizard(true)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-border text-sm font-medium text-text-secondary rounded-lg hover:bg-elevated hover:text-text-primary transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            {t('recommendations.updatePreferences')}
          </button>
        </div>

        {/* Too many results warning */}
        {resultThreshold?.too_many && (
          <div className="rounded-xl border border-status-warning/30 bg-status-warning/5 p-4 mb-6">
            <p className="font-medium text-text-primary text-sm">{t('recommendations.tooManyTitle', { count: resultThreshold.uncapped_total || total })}</p>
            <p className="text-xs text-text-muted mt-1">{t('recommendations.tooManySubtitle')}</p>
          </div>
        )}

        {/* Profile summary chips */}
        {profileSummary && (
          <div className="flex flex-wrap gap-2 mb-6">
            {profileSummary.fields.map(f => (
              <span key={f} className="text-xs font-medium px-3 py-1 bg-brand-primary/10 text-brand-primary rounded-full">{f}</span>
            ))}
            {profileSummary.countries.map(c => (
              <span key={c} className="text-xs font-medium px-3 py-1 bg-elevated text-text-secondary rounded-full">{c}</span>
            ))}
            {profileSummary.degree_level && (
              <span className="text-xs font-medium px-3 py-1 bg-elevated text-text-secondary rounded-full">
                {t(`degree.${profileSummary.degree_level.toLowerCase()}`)}
              </span>
            )}
            {profileSummary.gpa && (
              <span className="text-xs font-medium px-3 py-1 bg-elevated text-text-secondary rounded-full">
                GPA {profileSummary.gpa}
              </span>
            )}
            {profileSummary.budget_max && profileSummary.budget_max < 999999 && (
              <span className="text-xs font-medium px-3 py-1 bg-status-success/10 text-status-success rounded-full">
                ≤ {formatCurrency(profileSummary.budget_max, i18n.language)}
              </span>
            )}
          </div>
        )}

        {/* Refinement prompts */}
        {refinementPrompts && refinementPrompts.length > 0 && (
          <div className="rounded-xl border border-border bg-surface p-4 mb-8">
            <div className="flex items-center justify-between gap-4 mb-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">{t('recommendations.refineTitle')}</p>
                <p className="text-xs text-text-muted mt-0.5">{t('recommendations.refineSubtitle')}</p>
              </div>
              <button onClick={() => setShowWizard(true)} className="text-xs font-medium text-brand-primary hover:text-brand-primary/80 transition-colors flex-shrink-0">
                {t('recommendations.updatePreferences')}
              </button>
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              {refinementPrompts.map((p) => (
                <div key={p.code} className="rounded-lg bg-elevated p-3">
                  <p className="text-sm font-medium text-text-primary">{t(`recommendations.refinements.${p.code}.label`, { defaultValue: p.label })}</p>
                  <p className="text-xs text-text-muted mt-0.5">{t(`recommendations.refinements.${p.code}.detail`, { defaultValue: p.detail })}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && recommendations.length === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
          </div>
        )}

        {/* Recommendations grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
        >
          {recommendations.map(rec => {
            const explanations = rec.match_explanations && rec.match_explanations.length > 0
              ? rec.match_explanations.slice(0, 4)
              : [
                  ...rec.match_reasons.slice(0, 2).map(label => ({ label, kind: 'strength' as const, detail: null, points: 0, code: label })),
                  ...rec.warnings.slice(0, 2).map(label => ({ label, kind: 'warning' as const, detail: null, points: 0, code: label })),
                ];

            return (
              <motion.div
                key={rec.id}
                variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
                whileHover={{ y: -2 }}
                className="bg-surface rounded-xl border border-border hover:shadow-[0_4px_16px_rgba(13,115,119,0.10)] transition-all flex flex-col"
              >
                {/* Card header: score ring + program info side by side */}
                <div className="p-5 flex items-start gap-4 border-b border-border">
                  <ScoreRing score={rec.match_score} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1">
                      {t('recommendations.match')} · {rec.match_score}%
                    </p>
                    <h3 className="font-semibold text-text-primary text-sm leading-snug line-clamp-2">
                      {rec.program_name}
                    </h3>
                    <p className="text-xs text-text-muted mt-1">{rec.university_name}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {rec.country && (
                        <span className="text-xs text-text-muted bg-elevated px-2 py-0.5 rounded-full">{rec.country}</span>
                      )}
                      {rec.degree_level && (
                        <span className="text-xs text-text-muted bg-elevated px-2 py-0.5 rounded-full">{rec.degree_level}</span>
                      )}
                      {rec.tuition_fee === 0 && (
                        <span className="text-xs text-status-success bg-status-success/10 px-2 py-0.5 rounded-full">{t('recommendations.free')}</span>
                      )}
                      {rec.scholarship_available && (
                        <span className="text-xs text-status-warning bg-status-warning/10 px-2 py-0.5 rounded-full">{t('recommendations.scholarships')}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reasoning — the primary content of the card */}
                <div className="px-5 pt-4 pb-3 flex-1">
                  <div className="space-y-2">
                    {explanations.map((item) => (
                      <div key={`${rec.id}-${item.code}`} className="flex items-start gap-2">
                        <span className={cn(
                          'mt-0.5 flex-shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center',
                          item.kind === 'warning' ? 'text-status-warning' :
                          item.kind === 'info' ? 'text-text-muted' : 'text-status-success'
                        )} aria-hidden="true">
                          {item.kind === 'warning' ? (
                            <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 10a.75.75 0 110-1.5.75.75 0 010 1.5zm.75-3.75a.75.75 0 11-1.5 0V5.75a.75.75 0 011.5 0v1.5z"/></svg>
                          ) : item.kind === 'info' ? (
                            <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 4.5a.75.75 0 111.5 0v4a.75.75 0 11-1.5 0v-4z"/></svg>
                          ) : (
                            <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm3.28 5.78a.75.75 0 00-1.06-1.06L7 8.94 5.78 7.72a.75.75 0 00-1.06 1.06l1.75 1.75a.75.75 0 001.06 0l3.75-3.75z"/></svg>
                          )}
                        </span>
                        <div>
                          <p className={cn(
                            'text-xs leading-snug',
                            item.kind === 'warning' ? 'text-status-warning' :
                            item.kind === 'info' ? 'text-text-muted' : 'text-text-secondary'
                          )}>
                            {item.label}
                          </p>
                          {item.detail && <p className="text-[11px] text-text-muted mt-0.5">{item.detail}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <div className="px-5 pb-5">
                  <motion.button
                    onClick={() => handleTrack(rec.id)}
                    disabled={tracking === rec.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full py-2.5 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-primary/90 transition-colors disabled:opacity-50"
                  >
                    {tracking === rec.id ? (
                      <span className="flex items-center justify-center gap-2">
                        <Spinner className="h-4 w-4 border-white border-t-transparent" />
                        {t('recommendations.adding')}
                      </span>
                    ) : t('recommendations.addToTracker')}
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Load more */}
        {recommendations.length < total && (
          <div className="text-center mt-10">
            <button
              onClick={() => loadRecommendations(offset + limit)}
              disabled={loading}
              className="px-8 py-3 border border-border rounded-lg text-sm font-medium text-text-secondary hover:bg-elevated hover:text-text-primary transition-colors disabled:opacity-50"
            >
              {loading ? t('recommendations.loading') : t('recommendations.loadMore', { count: total - recommendations.length })}
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && recommendations.length === 0 && (
          <div className="text-center py-20">
            <div className="w-14 h-14 rounded-xl bg-brand-primary/10 flex items-center justify-center mx-auto mb-5" aria-hidden="true">
              <svg className="w-7 h-7 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">{t('recommendations.emptyTitle')}</h3>
            <p className="text-text-secondary mb-6 max-w-sm mx-auto text-pretty">{t('recommendations.emptySubtitle')}</p>
            <button
              onClick={() => setShowWizard(true)}
              className="px-6 py-3 bg-brand-primary text-white rounded-lg font-medium hover:bg-brand-primary/90 transition-colors"
            >
              {t('recommendations.updatePreferences')}
            </button>
          </div>
        )}
      </div>
    </PageTransition>
  );
};

export default RecommendationsPage;
