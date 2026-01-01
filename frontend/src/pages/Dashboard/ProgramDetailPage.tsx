import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { trackerApi } from '../../api/services';
import { PageTransition } from '../../components/Transitions/PageTransition';
import { Skeleton } from '../../components/Feedback/Skeleton';
import { cn } from '../../lib/cn';
import { formatDate } from '../../lib/format';
import type { TrackedProgram, ApplicationStatus, NoteEntry } from '../../types';
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS, NOTE_CATEGORIES, getMatchScoreColor } from '../../types';

export function ProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
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
      toast.error(t('programDetail.loadError'));
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
      toast.success(t('programDetail.statusUpdated'));
    } catch (err) {
      console.error('Failed to update status:', err);
      toast.error(t('programDetail.statusError'));
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
      toast.success(t('programDetail.checklistUpdated'));
    } catch (err) {
      console.error('Failed to update checklist:', err);
      toast.error(t('programDetail.checklistError'));
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
      toast.success(t('programDetail.itemAdded'));
    } catch (err) {
      console.error('Failed to add item:', err);
      toast.error(t('programDetail.itemAddError'));
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
      toast.success(t('programDetail.itemRemoved'));
    } catch (err) {
      console.error('Failed to delete item:', err);
      toast.error(t('programDetail.itemRemoveError'));
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
      toast.success(t('programDetail.notesSaved'));
    } catch (err) {
      console.error('Failed to save notes:', err);
      toast.error(t('programDetail.notesError'));
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
      toast.success(t('programDetail.noteAdded'));
    } catch (err) {
      console.error('Failed to add note:', err);
      toast.error(t('programDetail.noteAddError'));
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
      toast.success(t(entry.pinned ? 'programDetail.noteUnpinned' : 'programDetail.notePinned'));
    } catch (err) {
      console.error('Failed to toggle pin:', err);
      toast.error(t('programDetail.notePinError'));
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
      toast.success(t('programDetail.noteRemoved'));
    } catch (err) {
      console.error('Failed to delete note:', err);
      toast.error(t('programDetail.noteRemoveError'));
    } finally {
      setSaving(false);
    }
  };
  
  const handleDelete = async () => {
    if (!program || !confirm(t('programDetail.confirmRemove'))) return;
    try {
      await trackerApi.deleteProgram(program.id);
      toast.success(t('programDetail.programRemoved'));
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to delete:', err);
      toast.error(t('programDetail.programRemoveError'));
    }
  };
  
  if (loading) {
    return (
      <PageTransition>
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </PageTransition>
    );
  }
  
  if (!program) {
    return (
      <PageTransition>
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <p className="text-text-muted">{t('programDetail.notFound')}</p>
          <Link to="/dashboard" className="text-brand-primary hover:underline mt-4 inline-block">
            {t('programDetail.back')}
          </Link>
        </div>
      </PageTransition>
    );
  }
  
  const programName = program.program_name || program.custom_program_name || t('program.unknown');
  const universityName = program.university_name || program.custom_university_name || t('program.unknownUniversity');
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
    <PageTransition>
      <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <Link to="/dashboard" className="text-brand-primary hover:text-brand-secondary text-sm flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('programDetail.back')}
        </Link>
      </nav>
      
      {/* Header */}
      <div className="bg-surface rounded-2xl border border-border p-6 mb-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Match Score Badge */}
            {program.match_score && (
              <div
                className={cn(
                  'inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium mb-3',
                  getMatchScoreColor(program.match_score)
                )}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {t('program.matchScore', { score: program.match_score })}
              </div>
            )}
            
            <h1 className="text-2xl font-bold text-text-primary">{programName}</h1>
            <p className="text-lg text-text-muted mt-1">
              {universityName}
              {country && <span className="text-text-muted/70"> · {country}</span>}
            </p>
            
            {program.university_ranking_qs && (
              <p className="text-sm text-text-muted mt-2">
                {t('program.qsRanking', { rank: program.university_ranking_qs })}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <span className={cn('px-3 py-1.5 rounded-xl text-sm font-medium', PRIORITY_COLORS[program.priority])}>
              {t(PRIORITY_LABELS[program.priority])}
            </span>
            <motion.button
              onClick={handleDelete}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="text-text-muted hover:text-status-danger p-2 hover:bg-status-danger/10 rounded-lg transition-colors"
              title={t('program.remove')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </motion.button>
          </div>
        </div>
        
        {/* Status Selector */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            {t('programDetail.statusLabel')}
          </label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <motion.button
                key={value}
                onClick={() => handleStatusChange(value as ApplicationStatus)}
                disabled={saving}
                whileHover={saving ? undefined : { scale: 1.02 }}
                whileTap={saving ? undefined : { scale: 0.97 }}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                  program.status === value
                    ? STATUS_COLORS[value as ApplicationStatus]
                    : 'bg-elevated text-text-secondary hover:bg-elevated/80'
                )}
              >
                {t(label)}
              </motion.button>
            ))}
          </div>
        </div>
        
        {/* Important Dates */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-elevated rounded-xl border border-border">
            <div className="text-xs text-text-muted uppercase font-medium">{t('programDetail.dates.deadline')}</div>
            <div className="text-sm font-semibold text-text-primary mt-1">
              {deadline
                ? formatDate(deadline, i18n.language, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : t('programDetail.dates.notSet')}
            </div>
          </div>
          <div className="p-4 bg-elevated rounded-xl border border-border">
            <div className="text-xs text-text-muted uppercase font-medium">{t('programDetail.dates.submitted')}</div>
            <div className="text-sm font-semibold text-text-primary mt-1">
              {program.submitted_date
                ? formatDate(program.submitted_date, i18n.language, { month: 'short', day: 'numeric' })
                : t('programDetail.dates.notYet')}
            </div>
          </div>
          <div className="p-4 bg-elevated rounded-xl border border-border">
            <div className="text-xs text-text-muted uppercase font-medium">{t('programDetail.dates.result')}</div>
            <div className="text-sm font-semibold text-text-primary mt-1">
              {program.result_date
                ? formatDate(program.result_date, i18n.language, { month: 'short', day: 'numeric' })
                : t('programDetail.dates.pending')}
            </div>
          </div>
          <div className="p-4 bg-elevated rounded-xl border border-border">
            <div className="text-xs text-text-muted uppercase font-medium">{t('programDetail.dates.intake')}</div>
            <div className="text-sm font-semibold text-text-primary mt-1">
              {program.intake ? t(`intake.${program.intake}`) : t('programDetail.dates.notSet')}
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Checklist */}
        <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-text-primary">{t('programDetail.checklist.title')}</h2>
            <span
              className={cn(
                'text-sm font-medium px-2 py-1 rounded-lg',
                progressPercent === 100 ? 'bg-status-success/10 text-status-success' : 'bg-elevated text-text-secondary'
              )}
            >
              {completedItems}/{totalItems}
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full h-2 bg-elevated rounded-full mb-4 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                progressPercent === 100
                  ? 'bg-gradient-to-r from-status-success to-brand-accent'
                  : 'bg-gradient-to-r from-brand-primary to-brand-secondary'
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          
          <div className="space-y-1">
            {program.document_checklist?.map((item, index) => (
              <div
                key={item.id || index}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-elevated/60 group"
              >
                <label className="flex items-center flex-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={(e) => handleChecklistChange(index, e.target.checked)}
                    className="w-5 h-5 text-brand-primary rounded-lg border-border focus:ring-brand-primary"
                  />
                  <span className={`ms-3 ${item.completed ? 'text-text-muted line-through' : 'text-text-primary'}`}>
                    {item.name}
                    {item.required && !item.completed && (
                      <span className="text-status-danger ms-1">*</span>
                    )}
                  </span>
                </label>
                {item.id && (
                  <motion.button
                    onClick={() => handleDeleteChecklistItem(item.id!)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="text-text-muted/40 hover:text-status-danger p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </motion.button>
                )}
              </div>
            ))}
          </div>
          
          {/* Add Item */}
          {showAddItem ? (
            <div className="mt-4 p-3 bg-elevated rounded-xl">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder={t('programDetail.checklist.placeholder')}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent bg-background"
                onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-2">
                <motion.button
                  onClick={() => { setShowAddItem(false); setNewItemName(''); }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-3 py-1.5 text-text-muted hover:text-text-primary text-sm"
                >
                  {t('common.cancel')}
                </motion.button>
                <motion.button
                  onClick={handleAddChecklistItem}
                  disabled={!newItemName.trim() || saving}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-3 py-1.5 bg-brand-primary text-white rounded-lg text-sm hover:bg-brand-secondary disabled:opacity-50"
                >
                  {t('common.add')}
                </motion.button>
              </div>
            </div>
          ) : (
            <motion.button
              onClick={() => setShowAddItem(true)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
              className="mt-4 w-full py-2 text-sm text-brand-primary hover:text-brand-secondary hover:bg-brand-primary/10 rounded-xl transition-colors flex items-center justify-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('programDetail.checklist.addCustom')}
            </motion.button>
          )}
        </div>
        
        {/* Notes Section */}
        <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-text-primary">{t('programDetail.notes.title')}</h2>
            <motion.button
              onClick={() => setShowAddNote(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="text-brand-primary hover:text-brand-secondary text-sm flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('programDetail.notes.add')}
            </motion.button>
          </div>
          
          {/* Main Notes */}
          <div className="mb-4">
            {editingNotes ? (
              <div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-transparent resize-none bg-background"
                  placeholder={t('programDetail.notes.placeholder')}
                />
                <div className="flex justify-end gap-2 mt-2">
                  <motion.button
                    onClick={() => { setNotes(program.notes || ''); setEditingNotes(false); }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="px-3 py-1.5 text-text-muted hover:text-text-primary text-sm"
                  >
                    {t('common.cancel')}
                  </motion.button>
                  <motion.button
                    onClick={handleSaveNotes}
                    disabled={saving}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="px-3 py-1.5 bg-brand-primary text-white rounded-lg text-sm hover:bg-brand-secondary disabled:opacity-50"
                  >
                    {saving ? t('common.saving') : t('common.save')}
                  </motion.button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setEditingNotes(true)}
                className="p-4 bg-elevated rounded-xl cursor-pointer hover:bg-elevated/80 transition-colors min-h-[80px]"
              >
                {notes ? (
                  <p className="text-text-secondary whitespace-pre-wrap text-sm">{notes}</p>
                ) : (
                  <p className="text-text-muted text-sm">{t('programDetail.notes.empty')}</p>
                )}
              </div>
            )}
          </div>
          
          {/* Add Note Entry Form */}
          {showAddNote && (
            <div className="mb-4 p-4 bg-brand-primary/10 rounded-xl border border-brand-primary/20">
              <div className="flex gap-2 mb-3">
                {Object.entries(NOTE_CATEGORIES).map(([key, { icon, labelKey, color }]) => (
                  <motion.button
                    key={key}
                    onClick={() => setNewNoteCategory(key)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors',
                      newNoteCategory === key ? color : 'bg-surface text-text-secondary hover:bg-elevated'
                    )}
                  >
                    <span>{icon}</span>
                    <span>{t(labelKey)}</span>
                  </motion.button>
                ))}
              </div>
              <textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent resize-none bg-background"
                placeholder={t('programDetail.notes.entryPlaceholder')}
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-2">
                <motion.button
                  onClick={() => { setShowAddNote(false); setNewNoteContent(''); }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-3 py-1.5 text-text-muted hover:text-text-primary text-sm"
                >
                  {t('common.cancel')}
                </motion.button>
                <motion.button
                  onClick={handleAddNoteEntry}
                  disabled={!newNoteContent.trim() || saving}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-3 py-1.5 bg-brand-primary text-white rounded-lg text-sm hover:bg-brand-secondary disabled:opacity-50"
                >
                  {t('programDetail.notes.add')}
                </motion.button>
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
                  className={cn(
                    'p-3 rounded-xl border group',
                    entry.pinned
                      ? 'border-status-warning/30 bg-status-warning/10'
                      : 'border-border bg-elevated'
                  )}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-md', category.color)}>
                      {category.icon} {t(category.labelKey)}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <motion.button
                        onClick={() => handleTogglePin(entry.id)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={cn(
                          'p-1 rounded hover:bg-surface',
                          entry.pinned ? 'text-status-warning' : 'text-text-muted hover:text-status-warning'
                        )}
                        title={entry.pinned ? t('programDetail.notes.unpin') : t('programDetail.notes.pin')}
                      >
                        <svg className="w-4 h-4" fill={entry.pinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                      </motion.button>
                      <motion.button
                        onClick={() => handleDeleteNoteEntry(entry.id)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-1 rounded text-text-muted hover:text-status-danger hover:bg-surface"
                        title={t('common.delete')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </motion.button>
                    </div>
                  </div>
                  <p className="text-sm text-text-secondary">{entry.content}</p>
                  <p className="text-xs text-text-muted mt-1">
                    {formatDate(entry.created_at, i18n.language, {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              );
            })}
            
            {sortedNoteEntries.length === 0 && !showAddNote && (
              <p className="text-center text-text-muted text-sm py-4">
                {t('programDetail.notes.emptyEntries')}
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Share Journey Prompt */}
      {(program.status === 'accepted' || program.status === 'rejected') && !Boolean(program.shared_as_experience) && (
        <div className="mt-6 bg-gradient-to-r from-status-warning/10 to-brand-accent/10 rounded-2xl border border-status-warning/30 p-6">
          <div className="flex items-start gap-4">
            <span className="text-4xl">
              {program.status === 'accepted' ? '🎉' : '💪'}
            </span>
            <div className="flex-1">
              <h3 className="font-semibold text-text-primary">
                {program.status === 'accepted'
                  ? t('programDetail.share.acceptedTitle')
                  : t('programDetail.share.rejectedTitle')}
              </h3>
              <p className="text-text-muted mt-1">
                {t('programDetail.share.subtitle')}
              </p>
              <div className="mt-4 flex items-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-4 py-2 bg-gradient-to-r from-status-warning to-brand-accent text-white font-medium rounded-xl hover:from-brand-accent hover:to-status-warning transition-all shadow-sm"
                >
                  {t('programDetail.share.cta')}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="text-text-muted hover:text-text-primary"
                >
                  {t('common.maybeLater')}
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </PageTransition>
  );
}
