import React, { useState, useEffect } from 'react';
import { matchingApi } from '../../api/services';
import { ProfileWizard } from '../../components/Matching/ProfileWizard';
import type { Recommendation, MatchingProfile, RecommendationsResponse } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

export const RecommendationsPage: React.FC = () => {
  const { refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [total, setTotal] = useState(0);
  const [profileSummary, setProfileSummary] = useState<RecommendationsResponse['profile_summary'] | null>(null);
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
      setOffset(newOffset);
    } catch (err) {
      console.error('Error loading recommendations:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleWizardComplete = async (_profile: MatchingProfile, bonusAwarded: number) => {
    setShowWizard(false);
    if (bonusAwarded > 0) {
      await refreshUser();
    }
    await loadRecommendations();
  };
  
  const handleTrack = async (courseId: number) => {
    setTracking(courseId);
    try {
      await matchingApi.trackRecommendation(courseId, 'target');
      // Remove from recommendations list
      setRecommendations(prev => prev.filter(r => r.id !== courseId));
      setTotal(prev => prev - 1);
    } catch (err: any) {
      if (err.response?.data?.detail?.includes('already')) {
        alert('This program is already in your tracker');
      } else {
        alert('Failed to add program');
      }
    } finally {
      setTracking(null);
    }
  };
  
  const handleLoadMore = () => {
    loadRecommendations(offset + limit);
  };
  
  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'from-emerald-500 to-green-500';
    if (score >= 60) return 'from-blue-500 to-cyan-500';
    if (score >= 40) return 'from-amber-500 to-yellow-500';
    return 'from-gray-500 to-gray-400';
  };
  
  if (showWizard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Find Your Perfect Program
            </h1>
            <p className="text-gray-500 mt-2">Answer a few questions to get personalized recommendations</p>
          </div>
          <ProfileWizard onComplete={handleWizardComplete} />
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Your Recommendations
            </h1>
            <p className="text-gray-500 mt-1">
              {total} programs matched to your profile
            </p>
          </div>
          <button
            onClick={() => setShowWizard(true)}
            className="px-4 py-2 text-indigo-600 border border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Update Preferences
          </button>
        </div>
        
        {/* Profile Summary */}
        {profileSummary && (
          <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 flex flex-wrap gap-2">
            {profileSummary.fields.map(field => (
              <span key={field} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm">
                {field}
              </span>
            ))}
            {profileSummary.countries.map(country => (
              <span key={country} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                📍 {country}
              </span>
            ))}
            {profileSummary.degree_level && (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                🎓 {profileSummary.degree_level}
              </span>
            )}
            {profileSummary.budget_max && profileSummary.budget_max < 999999 && (
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                💰 Max €{profileSummary.budget_max.toLocaleString()}/year
              </span>
            )}
          </div>
        )}
        
        {/* Loading state */}
        {loading && recommendations.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        )}
        
        {/* Recommendations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendations.map(rec => (
            <div key={rec.id} className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all overflow-hidden group">
              {/* Match Score Header */}
              <div className={`bg-gradient-to-r ${getScoreColor(rec.match_score)} p-4 text-white`}>
                <div className="flex justify-between items-center">
                  <span className="text-3xl font-bold">{rec.match_score}%</span>
                  <span className="text-white/80 text-sm">Match</span>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-5">
                <h3 className="font-semibold text-gray-900 text-lg leading-tight mb-1 group-hover:text-indigo-600 transition-colors">
                  {rec.program_name}
                </h3>
                <p className="text-gray-500 text-sm mb-3">
                  {rec.university_name}
                </p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {rec.country && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs">
                      📍 {rec.country}
                    </span>
                  )}
                  {rec.degree_level && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs">
                      🎓 {rec.degree_level}
                    </span>
                  )}
                  {rec.tuition_fee !== null && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs">
                      {rec.tuition_fee === 0 ? '🆓 Free' : `€${rec.tuition_fee.toLocaleString()}/yr`}
                    </span>
                  )}
                  {rec.scholarship_available && (
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs">
                      🎁 Scholarships
                    </span>
                  )}
                </div>
                
                {/* Match Reasons */}
                <div className="space-y-1 mb-4">
                  {rec.match_reasons.slice(0, 3).map((reason, i) => (
                    <p key={i} className="text-sm text-emerald-600">{reason}</p>
                  ))}
                  {rec.warnings.slice(0, 2).map((warning, i) => (
                    <p key={i} className="text-sm text-amber-600">{warning}</p>
                  ))}
                </div>
                
                {/* Action */}
                <button
                  onClick={() => handleTrack(rec.id)}
                  disabled={tracking === rec.id}
                  className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-indigo-500/25 transition-all disabled:opacity-50"
                >
                  {tracking === rec.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Adding...
                    </span>
                  ) : (
                    '+ Add to Tracker'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {/* Load More */}
        {recommendations.length < total && (
          <div className="text-center mt-8">
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className="px-8 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {loading ? 'Loading...' : `Load More (${total - recommendations.length} remaining)`}
            </button>
          </div>
        )}
        
        {/* Empty State */}
        {!loading && recommendations.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No programs found</h3>
            <p className="text-gray-500 mb-4">Try adjusting your preferences to see more results</p>
            <button
              onClick={() => setShowWizard(true)}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
            >
              Update Preferences
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendationsPage;
