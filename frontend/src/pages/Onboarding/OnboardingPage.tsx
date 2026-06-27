import { motion } from 'framer-motion';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ProfileWizard } from '../../components/Matching/ProfileWizard';
import { PageTransition } from '../../components/Transitions/PageTransition';
import type { UserGoal } from '../../types';

const GOALS: Array<{ value: UserGoal; icon: string; titleKey: string; descriptionKey: string }> = [
  {
    value: 'applying',
    icon: '🚀',
    titleKey: 'onboarding.goals.applying.title',
    descriptionKey: 'onboarding.goals.applying.description',
  },
  {
    value: 'applied',
    icon: '✅',
    titleKey: 'onboarding.goals.applied.title',
    descriptionKey: 'onboarding.goals.applied.description',
  },
  {
    value: 'browsing',
    icon: '🔍',
    titleKey: 'onboarding.goals.browsing.title',
    descriptionKey: 'onboarding.goals.browsing.description',
  },
];

type OnboardingStep = 'goal' | 'profile' | 'complete';

export function OnboardingPage() {
  const navigate = useNavigate();
  const { user, setGoal, completeOnboarding } = useAuth();
  const { t } = useTranslation();
  const [selectedGoal, setSelectedGoal] = useState<UserGoal | null>(user?.goal ?? null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<OnboardingStep>('goal');
  const [bonusEarned, setBonusEarned] = useState(0);
  
  const handleGoalContinue = async () => {
    if (!selectedGoal) return;
    
    setLoading(true);
    try {
      await setGoal(selectedGoal);
      
      // For applicants, offer profile completion
      if (selectedGoal === 'applying') {
        setStep('profile');
      } else {
        await completeOnboarding();
        // Navigate based on goal
        if (selectedGoal === 'applied') {
          navigate('/contribute');
        } else {
          navigate('/explore');
        }
      }
    } catch (err) {
      console.error('Failed to set goal:', err);
      toast.error(t('onboarding.goalError'));
    } finally {
      setLoading(false);
    }
  };
  
  const handleProfileComplete = async (_profile: any, bonus: number) => {
    setBonusEarned(bonus);
    setStep('complete');
  };
  
  const handleSkipProfile = async () => {
    try {
      await completeOnboarding();
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
      toast.error(t('onboarding.completeError'));
    }
  };
  
  const handleFinish = async () => {
    try {
      await completeOnboarding();
      navigate('/recommendations');
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
      toast.error(t('onboarding.completeError'));
    }
  };
  
  // Step 1: Goal Selection
  if (step === 'goal') {
    return (
      <PageTransition>
        <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4">
          <div className="max-w-xl w-full">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-brand-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-text-primary">{t('onboarding.welcomeTitle')}</h1>
              <p className="mt-2 text-text-muted">
                {t('onboarding.welcomeSubtitle')}
              </p>
            </div>

            <div className="space-y-3 mb-8">
              {GOALS.map((goal) => (
                <motion.button
                  key={goal.value}
                  onClick={() => setSelectedGoal(goal.value)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full p-5 text-start rounded-xl border-2 transition-all ${
                    selectedGoal === goal.value
                      ? 'border-brand-primary bg-brand-primary/5'
                      : 'border-border bg-surface hover:border-brand-primary/30'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span className="text-2xl" aria-hidden="true">{goal.icon}</span>
                    <div>
                      <h3 className="font-semibold text-text-primary">{t(goal.titleKey)}</h3>
                      <p className="mt-0.5 text-sm text-text-muted">{t(goal.descriptionKey)}</p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>

            <motion.button
              onClick={handleGoalContinue}
              disabled={!selectedGoal || loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3.5 bg-brand-primary text-white font-medium rounded-lg hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? t('onboarding.settingUp') : t('onboarding.continue')}
            </motion.button>

            <div className="mt-6 text-center">
              <p className="text-sm text-text-muted">
                {t('onboarding.welcomeGift')}
              </p>
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  // Step 2: Profile Wizard (for applicants)
  if (step === 'profile') {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background py-8 px-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-text-primary">{t('onboarding.profileTitle')}</h1>
              <p className="mt-1 text-text-muted">
                {t('onboarding.profileSubtitle')}
              </p>
            </div>

            <ProfileWizard
              onComplete={handleProfileComplete}
              onSkip={handleSkipProfile}
            />
          </div>
        </div>
      </PageTransition>
    );
  }

  // Step 3: Completion
  return (
    <PageTransition>
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-status-success/10 rounded-xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-status-success" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-text-primary mb-2">{t('onboarding.completeTitle')}</h1>
          <p className="text-text-muted mb-6">
            {t('onboarding.completeSubtitle')}
          </p>

          {bonusEarned > 0 && (
            <div className="bg-brand-accent/10 border border-brand-accent/20 rounded-xl p-4 mb-6">
              <p className="text-brand-accent font-medium">
                {t('onboarding.bonusEarned', { amount: bonusEarned })}
              </p>
            </div>
          )}

          <motion.button
            onClick={handleFinish}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="w-full py-3.5 bg-brand-primary text-white font-medium rounded-lg hover:bg-brand-primary/90 transition-colors"
          >
            {t('onboarding.viewRecommendations')}
          </motion.button>

          <motion.button
            onClick={() => navigate('/dashboard')}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="w-full mt-3 py-3 text-text-muted font-medium hover:text-text-primary transition-colors"
          >
            {t('onboarding.goDashboard')}
          </motion.button>
        </div>
      </div>
    </PageTransition>
  );
}
