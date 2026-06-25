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
  
  useEffect(() => {
    checkProfileAndLoad();
  }, []);
  
  const checkProfileAndLoad = async () => {
    try {
      const profileData = await matchingApi.getProfile();
      if (!profileData.completed) {
        setShowWizard(true);
        setLoading(false);
        return;
      }
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
      if (newOffset === 0) {
        setRecommendations(data.recommendations);
      } else {
        setRecommendations(prev => [...prev, ...data.recommendations]);
      }
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
    if (bonusAwarded > 0) {
      await refreshUser();
      toast.success(t('recommendations.bonusEarned', { amount: bonusAwarded }));
    }
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
      if (err?.message?.includes('already')) {
        toast.error(t('recommendations.alreadyTracked'));
      } else {
        toast.error(t('recommendations.trackError'));
      }
    } finally {
      setTracking(null);
    }
  };
  
  const handleLoadMore = () => {
    loadRecommendations(offset + limit);
  };

  // Returns Tailwind utility classes for the score header band.
  // Uses solid semantic colors — no gradient, no dynamic class assembly (purge-safe).
  const getScoreHeaderClasses = (score: number): string => {
    if (score >= 80) return 'bg-status-success text-white';
    if (score >= 60) return 'bg-brand-primary text-white';
    if (score >= 40) return 'bg-status-warning text-white';
    return 'bg-elevated text-text-secondary';
  };
  
  if (showWizard) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              {/* P0 fix: no gradient text — use solid ink */}
              <h1 className="text-3xl font-bold text-text-primary">
                {t('recommendations.wizardTitle')}
              </h1>
              <p className="text-text-muted mt-2">{t('recommendations.wizardSubtitle')}</p>
            </div>
            <ProfileWizard onComplete={handleWizardComplete} />
          </div>
        </div>
      </PageTransition>
    );
  }
  
  return (
    <PageTransition>
      {/* No decorative gradient background — plain canvas */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            {/* P0 fix: no gradient text — solid ink heading */}
            <h1 className="text-3xl font-bold text-text-primary">
              {t('recommendations.title')}
            </h1>
            <p className="text-text-muted mt-1">
              {t('recommendations.subtitle', { count: total })}
            </p>
          </div>
          <motion.button
            onClick={() => setShowWizard(true)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="px-4 py-2 text-brand-primary border border-brand-primary/40 rounded-lg hover:bg-brand-primary/10 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            {t('recommendations.updatePreferences')}
          </motion.button>
        </div>
        
        {resultThreshold?.too_many && (
          <div className="bg-status-warning/10 border border-status-warning/30 rounded-xl p-4 mb-6">
            <p className="font-medium text-text-primary">{t('recommendations.tooManyTitle', { count: resultThreshold.uncapped_total || total })}</p>
            <p className="text-sm text-text-muted mt-1">{t('recommendations.tooManySubtitle')}</p>
          </div>
        )}

        {refinementPrompts && refinementPrompts.length > 0 && (
          <div className="bg-surface rounded-xl p-4 mb-6 border border-border">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
              <div>
                <h2 className="font-semibold text-text-primary">{t('recommendations.refineTitle')}</h2>
                <p className="text-sm text-text-muted">{t('recommendations.refineSubtitle')}</p>
              </div>
              <button onClick={() => setShowWizard(true)} className="text-sm font-medium text-brand-primary hover:text-brand-primary/80 transition-colors">
                {t('recommendations.updatePreferences')}
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {refinementPrompts.map((prompt) => (
                <div key={prompt.code} className="rounded-lg bg-elevated p-3">
                  <p className="text-sm font-medium text-text-primary">{t(`recommendations.refinements.${prompt.code}.label`, { defaultValue: prompt.label })}</p>
                  <p className="text-xs text-text-muted mt-1">{t(`recommendations.refinements.${prompt.code}.detail`, { defaultValue: prompt.detail })}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Profile Summary */}
        {profileSummary && (
          <div className="bg-surface rounded-xl p-4 mb-6 border border-border flex flex-wrap gap-2">
            {profileSummary.fields.map(field => (
              <span key={field} className="px-3 py-1 bg-brand-primary/10 text-brand-primary rounded-full text-sm">
                {field}
              </span>
            ))}
            {profileSummary.countries.map(country => (
              <span key={country} className="px-3 py-1 bg-brand-secondary/10 text-brand-secondary rounded-full text-sm">
                <span aria-hidden="true">📍 </span>{country}
              </span>
            ))}
            {profileSummary.degree_level && (
              <span className="px-3 py-1 bg-status-info/10 text-status-info rounded-full text-sm">
                {t(`degree.${profileSummary.degree_level.toLowerCase()}`)}
              </span>
            )}
            {profileSummary.language_preference && (
              <span className="px-3 py-1 bg-elevated text-text-secondary rounded-full text-sm">
                {t(`language.${profileSummary.language_preference}`)}
              </span>
            )}
            {profileSummary.gpa && (
              <span className="px-3 py-1 bg-elevated text-text-secondary rounded-full text-sm">
                {t('recommendations.gpaSummary', { gpa: profileSummary.gpa, scale: profileSummary.gpa_scale })}
              </span>
            )}
            {profileSummary.budget_max && profileSummary.budget_max < 999999 && (
              <span className="px-3 py-1 bg-status-success/10 text-status-success rounded-full text-sm">
                <span aria-hidden="true">💰 </span>{t('recommendations.budgetMax', { amount: formatCurrency(profileSummary.budget_max, i18n.language) })}
              </span>
            )}
          </div>
        )}
        
        {/* Loading state */}
        {loading && recommendations.length === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-72 rounded-xl" />
            ))}
          </div>
        )}
        
        {/* Recommendations Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        >
          {recommendations.map(rec => (
            <motion.div
              key={rec.id}
              variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
              whileHover={{ y: -2 }}
              className="bg-surface rounded-xl border border-border hover:shadow-[0_4px_16px_rgba(13,115,119,0.10)] transition-all overflow-hidden group"
            >
              {/* Match Score Header — solid semantic color, no gradient */}
              <div className={cn('px-4 py-3', getScoreHeaderClasses(rec.match_score))}>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold">{rec.match_score}%</span>
                  <span className="text-sm opacity-80">{t('recommendations.match')}</span>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-5">
                <h3 className="font-semibold text-text-primary text-base leading-tight mb-1 group-hover:text-brand-primary transition-colors">
                  {rec.program_name}
                </h3>
                <p className="text-text-muted text-sm mb-3">
                  {rec.university_name}
                </p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {rec.country && (
                    <span className="px-2 py-1 bg-elevated text-text-secondary rounded-lg text-xs">
                      <span aria-hidden="true">📍 </span>{rec.country}
                    </span>
                  )}
                  {rec.degree_level && (
                    <span className="px-2 py-1 bg-elevated text-text-secondary rounded-lg text-xs">
                      {rec.degree_level}
                    </span>
                  )}
                  {rec.tuition_fee !== null && (
                    <span className="px-2 py-1 bg-elevated text-text-secondary rounded-lg text-xs">
                      {rec.tuition_fee === 0
                        ? t('recommendations.free')
                        : t('recommendations.tuition', { amount: formatCurrency(rec.tuition_fee, i18n.language) })}
                    </span>
                  )}
                  {rec.scholarship_available && (
                    <span className="px-2 py-1 bg-status-warning/10 text-status-warning rounded-lg text-xs">
                      {t('recommendations.scholarships')}
                    </span>
                  )}
                </div>
                
                {/* Match Reasons */}
                <div className="space-y-2 mb-4">
                  {(rec.match_explanations && rec.match_explanations.length > 0
                    ? rec.match_explanations.slice(0, 5)
                    : [
                        ...rec.match_reasons.slice(0, 3).map((label) => ({ label, kind: 'strength' as const, detail: null, points: 0, code: label })),
                        ...rec.warnings.slice(0, 2).map((label) => ({ label, kind: 'warning' as const, detail: null, points: 0, code: label })),
                      ]
                  ).map((item) => (
                    <div key={`${rec.id}-${item.code}-${item.label}`} className="rounded-lg bg-elevated px-3 py-2">
                      <div className="flex items-start justify-between gap-3">
                        <p className={item.kind === 'warning' ? 'text-sm text-status-warning' : item.kind === 'info' ? 'text-sm text-text-muted' : 'text-sm text-status-success'}>
                          {item.label}
                        </p>
                        {item.points !== 0 && (
                          <span className="text-xs text-text-muted whitespace-nowrap">{item.points > 0 ? `+${item.points}` : item.points}</span>
                        )}
                      </div>
                      {item.detail && <p className="text-xs text-text-muted mt-1">{item.detail}</p>}
                    </div>
                  ))}
                </div>
                
                {/* Action — solid brand-primary, no gradient */}
                <motion.button
                  onClick={() => handleTrack(rec.id)}
                  disabled={tracking === rec.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full py-2.5 bg-brand-primary text-white rounded-lg font-medium hover:bg-brand-primary/90 transition-colors disabled:opacity-50"
                >
                  {tracking === rec.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <Spinner className="h-4 w-4 border-white border-t-transparent" />
                      {t('recommendations.adding')}
                    </span>
                  ) : (
                    t('recommendations.addToTracker')
                  )}
                </motion.button>
              </div>
            </motion.div>
          ))}
        </motion.div>
        
        {/* Load More */}
        {recommendations.length < total && (
          <div className="text-center mt-8">
            <motion.button
              onClick={handleLoadMore}
              disabled={loading}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="px-8 py-3 bg-surface border border-border rounded-lg text-text-secondary hover:bg-elevated transition-colors disabled:opacity-50"
            >
              {loading ? t('recommendations.loading') : t('recommendations.loadMore', { count: total - recommendations.length })}
            </motion.button>
          </div>
        )}
        
        {/* Empty State */}
        {!loading && recommendations.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4" aria-hidden="true">🔍</div>
            <h3 className="text-xl font-semibold text-text-primary mb-2">{t('recommendations.emptyTitle')}</h3>
            <p className="text-text-muted mb-6">{t('recommendations.emptySubtitle')}</p>
            <motion.button
              onClick={() => setShowWizard(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="px-6 py-3 bg-brand-primary text-white rounded-lg font-medium hover:bg-brand-primary/90 transition-colors"
            >
              {t('recommendations.updatePreferences')}
            </motion.button>
          </div>
        )}
      </div>
    </PageTransition>
  );
};

export default RecommendationsPage;
