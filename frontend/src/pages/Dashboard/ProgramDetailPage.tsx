import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { trackerApi } from '../../api/services';
import type { TrackedProgram, ApplicationStatus, NoteEntry } from '../../types';
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS, NOTE_CATEGORIES, getMatchScoreColor } from '../../types';

export function ProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [program, setProgram] = useState<TrackedProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Notes state
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [noteEntries, setNoteEntries] = useState<NoteEntry[]>([]);
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteCategory, setNewNoteCategory] = useState<string>('general');
  
  // Checklist state
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  
  useEffect(() => {
    loadProgram();
  }, [id]);
  
  const loadProgram = async () => {
    if (!id) return;
    try {
      const data = await trackerApi.getProgram(parseInt(id));
      setProgram(data);
      setNotes(data.notes || '');
      setNoteEntries(data.notes_entries || []);
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
  
  const handleAddChecklistItem = async () => {
    if (!program || !newItemName.trim()) return;
    setSaving(true);
    try {
      const updated = await trackerApi.addChecklistItem(program.id, { name: newItemName.trim() });
      setProgram(updated);
      setNewItemName('');
      setShowAddItem(false);
    } catch (err) {
      console.error('Failed to add item:', err);
    } finally {
      setSaving(false);
    }
  };
  
  const handleDeleteChecklistItem = async (itemId: string) => {
    if (!program) return;
    setSaving(true);
    try {
      const updated = await trackerApi.deleteChecklistItem(program.id, itemId);
      setProgram(updated);
    } catch (err) {
      console.error('Failed to delete item:', err);
    } finally {
      setSaving(false);
    }
  };
  
  const handleSaveNotes = async () => {
    if (!program) return;
    setSaving(true);
    try {
      await trackerApi.updateMainNotes(program.id, notes);
      setProgram({ ...program, notes });
      setEditingNotes(false);
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setSaving(false);
    }
  };
  
  const handleAddNoteEntry = async () => {
    if (!program || !newNoteContent.trim()) return;
    setSaving(true);
    try {
      const entry = await trackerApi.addNoteEntry(program.id, {
        content: newNoteContent.trim(),
        category: newNoteCategory
      });
      setNoteEntries([entry, ...noteEntries]);
      setNewNoteContent('');
      setNewNoteCategory('general');
      setShowAddNote(false);
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setSaving(false);
    }
  };
  
  const handleTogglePin = async (entryId: string) => {
    if (!program) return;
    const entry = noteEntries.find(e => e.id === entryId);
    if (!entry) return;
    
    setSaving(true);
    try {
      const updated = await trackerApi.updateNoteEntry(program.id, entryId, { pinned: !entry.pinned });
      setNoteEntries(noteEntries.map(e => e.id === entryId ? updated : e));
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    } finally {
      setSaving(false);
    }
  };
  
  const handleDeleteNoteEntry = async (entryId: string) => {
    if (!program) return;
    setSaving(true);
    try {
      await trackerApi.deleteNoteEntry(program.id, entryId);
      setNoteEntries(noteEntries.filter(e => e.id !== entryId));
    } catch (err) {
      console.error('Failed to delete note:', err);
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
        <Link to="/dashboard" className="text-indigo-600 hover:underline mt-4 inline-block">
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
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  
  // Sort note entries: pinned first, then by date
  const sortedNoteEntries = [...noteEntries].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <Link to="/dashboard" className="text-indigo-600 hover:text-indigo-700 text-sm flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>
      </nav>
      
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Match Score Badge */}
            {program.match_score && (
              <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium mb-3 ${getMatchScoreColor(program.match_score)}`}>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {program.match_score}% match
              </div>
            )}
            
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
          
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 rounded-xl text-sm font-medium ${PRIORITY_COLORS[program.priority]}`}>
              {PRIORITY_LABELS[program.priority]}
            </span>
            <button
              onClick={handleDelete}
              className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors"
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
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
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
          <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl">
            <div className="text-xs text-gray-500 uppercase font-medium">Deadline</div>
            <div className="text-sm font-semibold text-gray-900 mt-1">
              {deadline
                ? new Date(deadline).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : 'Not set'}
            </div>
          </div>
          <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl">
            <div className="text-xs text-gray-500 uppercase font-medium">Submitted</div>
            <div className="text-sm font-semibold text-gray-900 mt-1">
              {program.submitted_date
                ? new Date(program.submitted_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : 'Not yet'}
            </div>
          </div>
          <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl">
            <div className="text-xs text-gray-500 uppercase font-medium">Result Date</div>
            <div className="text-sm font-semibold text-gray-900 mt-1">
              {program.result_date
                ? new Date(program.result_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : 'Pending'}
            </div>
          </div>
          <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl">
            <div className="text-xs text-gray-500 uppercase font-medium">Intake</div>
            <div className="text-sm font-semibold text-gray-900 mt-1">
              {program.intake?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Not set'}
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Checklist */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Document Checklist</h2>
            <span className={`text-sm font-medium px-2 py-1 rounded-lg ${
              progressPercent === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {completedItems}/{totalItems}
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full h-2 bg-gray-100 rounded-full mb-4 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progressPercent === 100 
                  ? 'bg-gradient-to-r from-emerald-500 to-green-500' 
                  : 'bg-gradient-to-r from-indigo-500 to-purple-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          
          <div className="space-y-1">
            {program.document_checklist?.map((item, index) => (
              <div
                key={item.id || index}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 group"
              >
                <label className="flex items-center flex-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={(e) => handleChecklistChange(index, e.target.checked)}
                    className="w-5 h-5 text-indigo-600 rounded-lg border-gray-300 focus:ring-indigo-500"
                  />
                  <span className={`ml-3 ${item.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                    {item.name}
                    {item.required && !item.completed && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </span>
                </label>
                {item.id && (
                  <button
                    onClick={() => handleDeleteChecklistItem(item.id!)}
                    className="text-gray-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          
          {/* Add Item */}
          {showAddItem ? (
            <div className="mt-4 p-3 bg-gray-50 rounded-xl">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Document name..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => { setShowAddItem(false); setNewItemName(''); }}
                  className="px-3 py-1.5 text-gray-600 hover:text-gray-900 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddChecklistItem}
                  disabled={!newItemName.trim() || saving}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddItem(true)}
              className="mt-4 w-full py-2 text-sm text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl transition-colors flex items-center justify-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add custom item
            </button>
          )}
        </div>
        
        {/* Notes Section */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Notes</h2>
            <button
              onClick={() => setShowAddNote(true)}
              className="text-indigo-600 hover:text-indigo-700 text-sm flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Note
            </button>
          </div>
          
          {/* Main Notes */}
          <div className="mb-4">
            {editingNotes ? (
              <div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  placeholder="Add your main notes here... (supports markdown)"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => { setNotes(program.notes || ''); setEditingNotes(false); }}
                    className="px-3 py-1.5 text-gray-600 hover:text-gray-900 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveNotes}
                    disabled={saving}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setEditingNotes(true)}
                className="p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors min-h-[80px]"
              >
                {notes ? (
                  <p className="text-gray-700 whitespace-pre-wrap text-sm">{notes}</p>
                ) : (
                  <p className="text-gray-400 text-sm">Click to add main notes...</p>
                )}
              </div>
            )}
          </div>
          
          {/* Add Note Entry Form */}
          {showAddNote && (
            <div className="mb-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
              <div className="flex gap-2 mb-3">
                {Object.entries(NOTE_CATEGORIES).map(([key, { icon, label, color }]) => (
                  <button
                    key={key}
                    onClick={() => setNewNoteCategory(key)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                      newNoteCategory === key ? color : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span>{icon}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
              <textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-white"
                placeholder="Write your note..."
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => { setShowAddNote(false); setNewNoteContent(''); }}
                  className="px-3 py-1.5 text-gray-600 hover:text-gray-900 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddNoteEntry}
                  disabled={!newNoteContent.trim() || saving}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  Add Note
                </button>
              </div>
            </div>
          )}
          
          {/* Note Entries */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {sortedNoteEntries.map((entry) => {
              const category = NOTE_CATEGORIES[entry.category as keyof typeof NOTE_CATEGORIES] || NOTE_CATEGORIES.general;
              return (
                <div
                  key={entry.id}
                  className={`p-3 rounded-xl border ${entry.pinned ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-gray-50'} group`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${category.color}`}>
                      {category.icon} {category.label}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleTogglePin(entry.id)}
                        className={`p-1 rounded hover:bg-white ${entry.pinned ? 'text-amber-500' : 'text-gray-400 hover:text-amber-500'}`}
                        title={entry.pinned ? 'Unpin' : 'Pin'}
                      >
                        <svg className="w-4 h-4" fill={entry.pinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteNoteEntry(entry.id)}
                        className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-white"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700">{entry.content}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(entry.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              );
            })}
            
            {sortedNoteEntries.length === 0 && !showAddNote && (
              <p className="text-center text-gray-400 text-sm py-4">
                No quick notes yet. Click "Add Note" to create one.
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Share Journey Prompt */}
      {(program.status === 'accepted' || program.status === 'rejected') && !Boolean(program.shared_as_experience) && (
        <div className="mt-6 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl border border-amber-200 p-6">
          <div className="flex items-start gap-4">
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
              <div className="mt-4 flex items-center gap-4">
                <button className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm">
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
