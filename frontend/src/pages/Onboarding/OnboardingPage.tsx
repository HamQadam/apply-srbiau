import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ProfileWizard } from '../../components/Matching/ProfileWizard';
import type { UserGoal } from '../../types';

const GOALS: Array<{ value: UserGoal; icon: string; title: string; description: string }> = [
  {
    value: 'applying',
    icon: '🚀',
    title: "I'm applying abroad",
    description: 'Track your applications, deadlines, and documents in one place',
  },
  {
    value: 'applied',
    icon: '✅',
    title: "I've already applied or got accepted",
    description: 'Share your journey to help others and earn Ghadam coins',
  },
  {
    value: 'browsing',
    icon: '🔍',
    title: "I'm just exploring",
    description: 'Browse programs and see what others have achieved',
  },
];

type OnboardingStep = 'goal' | 'profile' | 'complete';

export function OnboardingPage() {
  const navigate = useNavigate();
  const { user, setGoal, completeOnboarding } = useAuth();
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
    }
  };
  
  const handleFinish = async () => {
    try {
      await completeOnboarding();
      navigate('/recommendations');
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
    }
  };
  
  // Step 1: Goal Selection
  if (step === 'goal') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4">
        <div className="max-w-xl w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-3xl">👋</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome to Ghadam!</h1>
            <p className="mt-2 text-gray-600">
              Let's personalize your experience. What brings you here?
            </p>
          </div>
          
          <div className="space-y-4 mb-8">
            {GOALS.map((goal) => (
              <button
                key={goal.value}
                onClick={() => setSelectedGoal(goal.value)}
                className={`w-full p-6 text-left rounded-2xl border-2 transition-all ${
                  selectedGoal === goal.value
                    ? 'border-indigo-500 bg-indigo-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-indigo-200 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start gap-4">
                  <span className="text-3xl">{goal.icon}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{goal.title}</h3>
                    <p className="mt-1 text-sm text-gray-600">{goal.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          
          <button
            onClick={handleGoalContinue}
            disabled={!selectedGoal || loading}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
          >
            {loading ? 'Setting up...' : 'Continue'}
          </button>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              You received <span className="font-medium text-amber-600">30 Ghadam coins</span> as a welcome gift! 🪙
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Step 2: Profile Wizard (for applicants)
  if (step === 'profile') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Complete Your Profile</h1>
            <p className="mt-1 text-gray-600">
              Help us find the perfect programs for you
            </p>
          </div>
          
          <ProfileWizard 
            onComplete={handleProfileComplete}
            onSkip={handleSkipProfile}
          />
        </div>
      </div>
    );
  }
  
  // Step 3: Completion
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">You're All Set!</h1>
        <p className="text-gray-600 mb-6">
          Your profile is complete. We'll now find programs that match your preferences.
        </p>
        
        {bonusEarned > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
            <p className="text-amber-800">
              You earned <span className="font-bold text-amber-600">{bonusEarned} Ghadam coins</span> for completing your profile! 🎉
            </p>
          </div>
        )}
        
        <button
          onClick={handleFinish}
          className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md"
        >
          View My Recommendations
        </button>
        
        <button
          onClick={() => navigate('/dashboard')}
          className="w-full mt-3 py-3 text-gray-600 font-medium hover:text-gray-900 transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
