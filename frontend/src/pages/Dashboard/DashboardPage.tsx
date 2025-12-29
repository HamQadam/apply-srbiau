import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { trackerApi } from '../../api/services';
import { ProgramCard } from '../../components/Tracker/ProgramCard';
import { DeadlineList } from '../../components/Tracker/DeadlineList';
import type { TrackedProgram, TrackerStats, DeadlineItem } from '../../types';

export function DashboardPage() {
  const { user } = useAuth();
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
    } finally {
      setLoading(false);
    }
  };
  
  const handleStatusChange = async (id: number, status: string) => {
    try {
      await trackerApi.updateProgram(id, { status: status as TrackedProgram['status'] });
      loadData();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };
  
  const handleDelete = async (id: number) => {
    if (!confirm('Remove this program from your tracker?')) return;
    try {
      await trackerApi.deleteProgram(id);
      loadData();
    } catch (err) {
      console.error('Failed to delete:', err);
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
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {user?.display_name ? `Hey ${user.display_name}!` : 'Your Dashboard'}
          </h1>
          <p className="text-gray-600 mt-1">Track and manage your applications</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/recommendations"
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-sm flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span>Find Programs</span>
          </Link>
          <Link
            to="/dashboard/add"
            className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Program</span>
          </Link>
        </div>
      </div>
      
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="text-2xl font-bold text-gray-900">{stats.total_programs}</div>
            <div className="text-sm text-gray-600">Total Programs</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="text-2xl font-bold text-emerald-600">{stats.accepted_count}</div>
            <div className="text-sm text-gray-600">Accepted</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="text-2xl font-bold text-amber-600">{stats.pending_count}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="text-2xl font-bold text-orange-600">{stats.upcoming_deadlines}</div>
            <div className="text-sm text-gray-600">Deadlines Soon</div>
          </div>
          {/* Document Progress */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <div className="text-2xl font-bold text-indigo-600">{documentProgress}%</div>
              <span className="text-xs text-gray-500">{documentStats.completed}/{documentStats.total}</span>
            </div>
            <div className="text-sm text-gray-600 mb-2">Docs Ready</div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${
                  documentProgress === 100 
                    ? 'bg-gradient-to-r from-emerald-500 to-green-500' 
                    : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                }`}
                style={{ width: `${documentProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Programs List */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Your Programs</h2>
            {programs.length > 0 && (
              <span className="text-sm text-gray-500">{programs.length} program{programs.length !== 1 ? 's' : ''}</span>
            )}
          </div>
          
          {programs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📝</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900">No programs yet</h3>
              <p className="mt-2 text-gray-600 max-w-sm mx-auto">
                Start by finding programs that match your profile or add one manually
              </p>
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to="/recommendations"
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all"
                >
                  Find Matching Programs
                </Link>
                <Link
                  to="/dashboard/add"
                  className="px-4 py-2 text-indigo-600 font-medium hover:text-indigo-700"
                >
                  Add Manually
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {programs.map((program) => (
                <ProgramCard
                  key={program.id}
                  program={program}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Deadlines */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Upcoming Deadlines
            </h3>
            <DeadlineList deadlines={deadlines} />
          </div>
          
          {/* Profile Match Card */}
          {!user?.matching_profile_completed && (
            <Link 
              to="/recommendations"
              className="block bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-5 border border-purple-100 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-purple-900">Get Personalized Recommendations</h3>
                  <p className="text-sm text-purple-700 mt-1">
                    Complete your profile to find programs that match your goals
                  </p>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-purple-600 mt-2">
                    Complete Profile
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </div>
            </Link>
          )}
          
          {/* Ghadam Balance */}
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-5 border border-amber-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-amber-900">Ghadam Balance</h3>
              <span className="text-2xl">🪙</span>
            </div>
            <div className="text-3xl font-bold text-amber-700">
              {user?.ghadam_balance || 0}
            </div>
            <p className="text-sm text-amber-600 mt-1">
              Use coins to unlock detailed profiles
            </p>
          </div>
          
          {/* Quick Tips */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              💡 Tips
            </h3>
            <ul className="text-sm text-blue-800 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-400">•</span>
                <span>Complete your profile to get AI-powered program matches</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400">•</span>
                <span>Use the document checklist to stay organized</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400">•</span>
                <span>Share your journey after results to earn coins</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
