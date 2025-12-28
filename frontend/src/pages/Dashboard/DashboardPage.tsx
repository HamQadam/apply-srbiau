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
        <Link
          to="/dashboard/add"
          className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <span>+</span>
          <span>Add Program</span>
        </Link>
      </div>
      
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.total_programs}</div>
            <div className="text-sm text-gray-600">Total Programs</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-2xl font-bold text-green-600">{stats.accepted_count}</div>
            <div className="text-sm text-gray-600">Accepted</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending_count}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.upcoming_deadlines}</div>
            <div className="text-sm text-gray-600">Deadlines (30 days)</div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Programs List */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Programs</h2>
          
          {programs.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <span className="text-5xl">📝</span>
              <h3 className="mt-4 text-lg font-medium text-gray-900">No programs yet</h3>
              <p className="mt-2 text-gray-600">
                Start by adding the programs you're interested in
              </p>
              <Link
                to="/dashboard/add"
                className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
              >
                Add Your First Program
              </Link>
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
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Upcoming Deadlines</h3>
            <DeadlineList deadlines={deadlines} />
          </div>
          
          {/* Quick Tips */}
          <div className="bg-blue-50 rounded-xl p-4">
            <h3 className="font-semibold text-blue-900 mb-2">💡 Tips</h3>
            <ul className="text-sm text-blue-800 space-y-2">
              <li>• Keep your tracker updated to stay organized</li>
              <li>• Add all programs you're considering, even reach schools</li>
              <li>• Use notes to track important details</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
