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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-primary/10 via-background to-brand-secondary/10 py-12 px-4">
          <div className="max-w-xl w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-3xl">👋</span>
            </div>
            <h1 className="text-3xl font-bold text-text-primary">{t('onboarding.welcomeTitle')}</h1>
            <p className="mt-2 text-text-muted">
              {t('onboarding.welcomeSubtitle')}
            </p>
          </div>
          
          <div className="space-y-4 mb-8">
            {GOALS.map((goal) => (
              <motion.button
                key={goal.value}
                onClick={() => setSelectedGoal(goal.value)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full p-6 text-start rounded-2xl border-2 transition-all ${
                  selectedGoal === goal.value
                    ? 'border-brand-primary bg-brand-primary/10 shadow-md'
                    : 'border-border bg-surface hover:border-brand-primary/30 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start gap-4">
                  <span className="text-3xl">{goal.icon}</span>
                  <div>
                    <h3 className="font-semibold text-text-primary">{t(goal.titleKey)}</h3>
                    <p className="mt-1 text-sm text-text-muted">{t(goal.descriptionKey)}</p>
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
            className="w-full py-3.5 bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-medium rounded-xl hover:from-brand-secondary hover:to-brand-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
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
        <div className="min-h-screen bg-gradient-to-br from-brand-primary/10 via-background to-brand-secondary/10 py-8 px-4">
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-primary/10 via-background to-brand-secondary/10 py-12 px-4">
        <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-status-success to-brand-accent rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="text-3xl font-bold text-text-primary mb-2">{t('onboarding.completeTitle')}</h1>
        <p className="text-text-muted mb-6">
          {t('onboarding.completeSubtitle')}
        </p>
        
        {bonusEarned > 0 && (
          <div className="bg-brand-accent/10 border border-brand-accent/30 rounded-2xl p-4 mb-6">
            <p className="text-brand-accent">
              {t('onboarding.bonusEarned', { amount: bonusEarned })}
            </p>
          </div>
        )}
        
        <motion.button
          onClick={handleFinish}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="w-full py-3.5 bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-medium rounded-xl hover:from-brand-secondary hover:to-brand-primary transition-all shadow-md"
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
