import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { trackerApi } from '../../api/services';
import type { TrackedProgram,  ApplicationStatus } from '../../types';
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS } from '../../types';

export function ProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [program, setProgram] = useState<TrackedProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');
  
  useEffect(() => {
    loadProgram();
  }, [id]);
  
  const loadProgram = async () => {
    if (!id) return;
    try {
      const data = await trackerApi.getProgram(parseInt(id));
      setProgram(data);
      setNotes(data.notes || '');
    } catch (err) {
      console.error('Failed to load program:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleStatusChange = async (status: ApplicationStatus) => {
    if (!program) return;
    setSaving(true);
    try {
      const updated = await trackerApi.updateProgram(program.id, { status });
      setProgram(updated);
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setSaving(false);
    }
  };
  
  const handleChecklistChange = async (index: number, completed: boolean) => {
    if (!program || !program.document_checklist) return;
    
    const newChecklist = [...program.document_checklist];
    newChecklist[index] = { ...newChecklist[index], completed };
    
    setSaving(true);
    try {
      await trackerApi.updateChecklist(program.id, newChecklist);
      setProgram({ ...program, document_checklist: newChecklist });
    } catch (err) {
      console.error('Failed to update checklist:', err);
    } finally {
      setSaving(false);
    }
  };
  
  const handleSaveNotes = async () => {
    if (!program) return;
    setSaving(true);
    try {
      const updated = await trackerApi.updateProgram(program.id, { notes });
      setProgram(updated);
      setEditingNotes(false);
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setSaving(false);
    }
  };
  
  const handleDelete = async () => {
    if (!program || !confirm('Remove this program from your tracker?')) return;
    try {
      await trackerApi.deleteProgram(program.id);
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };
  
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }
  
  if (!program) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-gray-600">Program not found</p>
        <Link to="/dashboard" className="text-blue-600 hover:underline mt-4 inline-block">
          Back to Dashboard
        </Link>
      </div>
    );
  }
  
  const programName = program.program_name || program.custom_program_name || 'Unknown Program';
  const universityName = program.university_name || program.custom_university_name || 'Unknown University';
  const country = program.country || program.custom_country || '';
  const deadline = program.deadline || program.program_deadline;
  
  const completedItems = program.document_checklist?.filter(item => item.completed).length || 0;
  const totalItems = program.document_checklist?.length || 0;
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <Link to="/dashboard" className="text-blue-600 hover:underline text-sm">
          ← Back to Dashboard
        </Link>
      </nav>
      
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{programName}</h1>
            <p className="text-lg text-gray-600 mt-1">
              {universityName}
              {country && <span className="text-gray-400"> · {country}</span>}
            </p>
            
            {program.university_ranking_qs && (
              <p className="text-sm text-gray-500 mt-2">
                QS World Ranking: #{program.university_ranking_qs}
              </p>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${PRIORITY_COLORS[program.priority]}`}>
              {PRIORITY_LABELS[program.priority]}
            </span>
            <button
              onClick={handleDelete}
              className="text-gray-400 hover:text-red-500 p-2"
              title="Remove from tracker"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Status Selector */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Application Status
          </label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <button
                key={value}
                onClick={() => handleStatusChange(value as ApplicationStatus)}
                disabled={saving}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  program.status === value
                    ? STATUS_COLORS[value as ApplicationStatus]
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Important Dates */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500 uppercase">Deadline</div>
            <div className="text-sm font-medium text-gray-900 mt-1">
              {deadline
                ? new Date(deadline).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : 'Not set'}
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500 uppercase">Submitted</div>
            <div className="text-sm font-medium text-gray-900 mt-1">
              {program.submitted_date
                ? new Date(program.submitted_date).toLocaleDateString()
                : 'Not yet'}
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500 uppercase">Result Date</div>
            <div className="text-sm font-medium text-gray-900 mt-1">
              {program.result_date
                ? new Date(program.result_date).toLocaleDateString()
                : 'Pending'}
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500 uppercase">Intake</div>
            <div className="text-sm font-medium text-gray-900 mt-1">
              {program.intake?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Not set'}
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Checklist */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Document Checklist</h2>
            <span className="text-sm text-gray-500">
              {completedItems}/{totalItems} complete
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${totalItems > 0 ? (completedItems / totalItems) * 100 : 0}%` }}
            ></div>
          </div>
          
          <div className="space-y-2">
            {program.document_checklist?.map((item, index) => (
              <label
                key={index}
                className="flex items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={(e) => handleChecklistChange(index, e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className={`ml-3 ${item.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                  {item.name}
                  {item.required && !item.completed && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </div>
        
        {/* Notes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Notes</h2>
            {!editingNotes && (
              <button
                onClick={() => setEditingNotes(true)}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                Edit
              </button>
            )}
          </div>
          
          {editingNotes ? (
            <div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Add your notes here..."
              />
              <div className="flex justify-end space-x-2 mt-3">
                <button
                  onClick={() => {
                    setNotes(program.notes || '');
                    setEditingNotes(false);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNotes}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-600 whitespace-pre-wrap">
              {program.notes || 'No notes yet. Click Edit to add notes.'}
            </p>
          )}
        </div>
      </div>
      
      {/* Share Journey Prompt - Show if accepted or rejected */}
      {(program.status === 'accepted' || program.status === 'rejected') && !Boolean(program.shared_as_experience) && (
        <div className="mt-6 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200 p-6">
          <div className="flex items-start space-x-4">
            <span className="text-4xl">
              {program.status === 'accepted' ? '🎉' : '💪'}
            </span>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">
                {program.status === 'accepted'
                  ? 'Congratulations on your acceptance!'
                  : 'Every journey teaches something valuable'}
              </h3>
              <p className="text-gray-600 mt-1">
                Your experience can help future students. Share your journey to earn Ghadam coins
                and help others make better decisions.
              </p>
              <div className="mt-4 flex items-center space-x-4">
                <button className="px-4 py-2 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 transition-colors">
                  Share My Journey (+150 🪙)
                </button>
                <button className="text-gray-500 hover:text-gray-700">
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
