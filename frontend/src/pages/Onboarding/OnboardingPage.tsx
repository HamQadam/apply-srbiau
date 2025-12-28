import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
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

export function OnboardingPage() {
  const navigate = useNavigate();
  const { user, setGoal, completeOnboarding } = useAuth();
  const [selectedGoal, setSelectedGoal] = useState<UserGoal | null>(user?.goal ?? null);
  const [loading, setLoading] = useState(false);
  
  const handleContinue = async () => {
    if (!selectedGoal) return;
    
    setLoading(true);
    try {
      await setGoal(selectedGoal);
      await completeOnboarding();
      
      // Navigate based on goal
      if (selectedGoal === 'applying') {
        navigate('/dashboard');
      } else if (selectedGoal === 'applied') {
        navigate('/contribute');
      } else {
        navigate('/explore');
      }
    } catch (err) {
      console.error('Failed to set goal:', err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome! 🎉</h1>
          <p className="mt-2 text-gray-600">
            Let's personalize your experience. What brings you to Ghadam?
          </p>
        </div>
        
        <div className="space-y-4 mb-8">
          {GOALS.map((goal) => (
            <button
              key={goal.value}
              onClick={() => setSelectedGoal(goal.value)}
              className={`w-full p-6 text-left rounded-xl border-2 transition-all ${
                selectedGoal === goal.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-start space-x-4">
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
          onClick={handleContinue}
          disabled={!selectedGoal || loading}
          className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
