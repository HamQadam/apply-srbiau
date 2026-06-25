import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { trackerApi } from '../../api/services';
import { PageTransition } from '../../components/Transitions/PageTransition';
import { Skeleton } from '../../components/Feedback/Skeleton';
import { ConfirmDialog } from '../../components/Feedback/ConfirmDialog';
import { cn } from '../../lib/cn';
import { formatDate } from '../../lib/format';
import type { TrackedProgram, ApplicationStatus, NoteEntry, UpdateTrackedProgramRequest } from '../../types';
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS, NOTE_CATEGORIES, getMatchScoreColor } from '../../types';

// ── Chevron back icon ─────────────────────────────────────────
function BackIcon() {
  return (
    <svg className="w-4 h-4 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

export function ProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [program, setProgram] = useState<TrackedProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
  const [newItemRequired, setNewItemRequired] = useState(true);

  useEffect(() => { loadProgram(); }, [id]);

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
      toast.error(t('programDetail.statusError'));
    } finally { setSaving(false); }
  };

  const handleChecklistChange = async (index: number, completed: boolean) => {
    if (!program?.document_checklist) return;
    const newChecklist = [...program.document_checklist];
    newChecklist[index] = { ...newChecklist[index], completed };
    setSaving(true);
    try {
      await trackerApi.updateChecklist(program.id, newChecklist);
      setProgram({ ...program, document_checklist: newChecklist });
    } catch (err) {
      toast.error(t('programDetail.checklistError'));
    } finally { setSaving(false); }
  };

  const handleAddChecklistItem = async () => {
    if (!program || !newItemName.trim()) return;
    setSaving(true);
    try {
      const updated = await trackerApi.addChecklistItem(program.id, { name: newItemName.trim(), required: newItemRequired });
      setProgram({ ...program, document_checklist: updated.document_checklist });
      setNewItemName(''); setNewItemRequired(true); setShowAddItem(false);
      toast.success(t('programDetail.itemAdded'));
    } catch (err) {
      toast.error(t('programDetail.itemAddError'));
    } finally { setSaving(false); }
  };

  const handleDeleteChecklistItem = async (itemId: string) => {
    if (!program) return;
    setSaving(true);
    try {
      const updated = await trackerApi.deleteChecklistItem(program.id, itemId);
      setProgram({ ...program, document_checklist: updated.document_checklist });
    } catch (err) {
      toast.error(t('programDetail.itemRemoveError'));
    } finally { setSaving(false); }
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
      toast.error(t('programDetail.notesError'));
    } finally { setSaving(false); }
  };

  const handleAddNoteEntry = async () => {
    if (!program || !newNoteContent.trim()) return;
    setSaving(true);
    try {
      const entry = await trackerApi.addNoteEntry(program.id, { content: newNoteContent.trim(), category: newNoteCategory });
      setNoteEntries([entry, ...noteEntries]);
      setNewNoteContent(''); setNewNoteCategory('general'); setShowAddNote(false);
      toast.success(t('programDetail.noteAdded'));
    } catch (err) {
      toast.error(t('programDetail.noteAddError'));
    } finally { setSaving(false); }
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
      toast.error(t('programDetail.notePinError'));
    } finally { setSaving(false); }
  };

  const handleDeleteNoteEntry = async (entryId: string) => {
    if (!program) return;
    setSaving(true);
    try {
      await trackerApi.deleteNoteEntry(program.id, entryId);
      setNoteEntries(noteEntries.filter(e => e.id !== entryId));
    } catch (err) {
      toast.error(t('programDetail.noteRemoveError'));
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!program) return;
    setSaving(true);
    try {
      await trackerApi.deleteProgram(program.id);
      toast.success(t('programDetail.programRemoved'));
      navigate('/dashboard');
    } catch (err) {
      toast.error(t('programDetail.programRemoveError'));
    } finally { setSaving(false); setShowDeleteConfirm(false); }
  };

  const handleDateUpdate = async (field: 'deadline' | 'submitted_date' | 'result_date' | 'interview_date', value: string) => {
    if (!program) return;
    const payload = { [field]: value || null } as UpdateTrackedProgramRequest;
    setSaving(true);
    try {
      const updated = await trackerApi.updateProgram(program.id, payload);
      setProgram(updated);
    } catch (err) {
      toast.error(t('programDetail.dates.error'));
    } finally { setSaving(false); }
  };

  const handleReminderToggle = async (enabled: boolean) => {
    if (!program) return;
    setSaving(true);
    try {
      const updated = await trackerApi.updateProgram(program.id, { reminders_enabled: enabled });
      setProgram(updated);
    } catch (err) {
      toast.error(t('programDetail.reminders.error'));
    } finally { setSaving(false); }
  };

  const handleReminderOffsetToggle = async (offset: number) => {
    if (!program) return;
    const current = program.reminder_offsets_days?.length ? program.reminder_offsets_days : [30, 14, 7, 1];
    const next = current.includes(offset) ? current.filter(i => i !== offset) : [...current, offset].sort((a, b) => b - a);
    setSaving(true);
    try {
      const updated = await trackerApi.updateProgram(program.id, { reminder_offsets_days: next });
      setProgram(updated);
    } catch (err) {
      toast.error(t('programDetail.reminders.error'));
    } finally { setSaving(false); }
  };

  const handlePrintPlan = async () => {
    if (!program) return;
    try { await trackerApi.getPrintablePlan(program.id); window.print(); }
    catch (err) { toast.error(t('programDetail.exportError')); }
  };

  // ── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <PageTransition>
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-28 rounded-xl" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-40 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-40 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!program) {
    return (
      <PageTransition>
        <div className="max-w-5xl mx-auto px-4 py-16 text-center">
          <p className="text-text-muted">{t('programDetail.notFound')}</p>
          <Link to="/dashboard" className="mt-4 inline-flex items-center gap-1 text-sm text-brand-primary hover:text-brand-primary/80">
            <BackIcon /> {t('programDetail.back')}
          </Link>
        </div>
      </PageTransition>
    );
  }

  const programName = program.program_name || program.custom_program_name || t('program.unknown');
  const universityName = program.university_name || program.custom_university_name || t('program.unknownUniversity');
  const country = program.country || program.custom_country || '';

  const completedItems = program.document_checklist?.filter(i => i.completed).length || 0;
  const totalItems = program.document_checklist?.length || 0;
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  const reminderOffsets = program.reminder_offsets_days?.length ? program.reminder_offsets_days : [30, 14, 7, 1];
  const reminderOptions = [30, 14, 7, 1];

  const sortedNoteEntries = [...noteEntries].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Breadcrumb */}
        <nav className="mb-6" aria-label="breadcrumb">
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-brand-primary hover:text-brand-primary/80 transition-colors">
            <BackIcon /> {t('programDetail.back')}
          </Link>
        </nav>

        {/* ── Program identity header ── */}
        <div className="rounded-xl border border-border bg-surface p-6 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {program.match_score && (
                <div className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium mb-3', getMatchScoreColor(program.match_score))}>
                  {t('program.matchScore', { score: program.match_score })}
                </div>
              )}
              <h1 className="text-xl font-bold text-text-primary">{programName}</h1>
              <p className="text-text-secondary mt-1">
                {universityName}
                {country && <span className="text-text-muted"> · {country}</span>}
              </p>
              {program.university_ranking_qs && (
                <p className="text-xs text-text-muted mt-1.5">{t('program.qsRanking', { rank: program.university_ranking_qs })}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', PRIORITY_COLORS[program.priority])}>
                {t(PRIORITY_LABELS[program.priority])}
              </span>
              <button
                onClick={handlePrintPlan}
                className="p-2 text-text-muted hover:text-brand-primary rounded-lg hover:bg-elevated transition-colors"
                title={t('programDetail.printPlan')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z" />
                </svg>
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 text-text-muted hover:text-status-danger rounded-lg hover:bg-status-danger/10 transition-colors"
                title={t('program.remove')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Status selector */}
          <div className="mt-5 pt-5 border-t border-border">
            <p className="text-xs font-medium text-text-muted mb-2">{t('programDetail.statusLabel')}</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => handleStatusChange(value as ApplicationStatus)}
                  disabled={saving}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50',
                    program.status === value ? STATUS_COLORS[value as ApplicationStatus] : 'bg-elevated text-text-secondary hover:bg-border'
                  )}
                >
                  {t(label)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: program info + notes (2/3) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Important dates */}
            <div className="rounded-xl border border-border bg-surface p-5">
              <h2 className="text-sm font-semibold text-text-primary mb-4">{t('programDetail.dates.title', 'Important dates')}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {([
                  { field: 'deadline' as const, label: t('programDetail.dates.deadline'), value: program.deadline || '', inherited: !program.deadline ? program.program_deadline : null },
                  { field: 'submitted_date' as const, label: t('programDetail.dates.submitted'), value: program.submitted_date || '', inherited: null },
                  { field: 'result_date' as const, label: t('programDetail.dates.result'), value: program.result_date || '', inherited: null },
                  { field: 'interview_date' as const, label: t('programDetail.dates.interview'), value: program.interview_date || '', inherited: null },
                ] as const).map((item) => {
                  const display = item.value || item.inherited;
                  return (
                    <div key={item.field} className="rounded-lg bg-elevated p-3">
                      <p className="text-[11px] font-medium text-text-muted uppercase tracking-wide">{item.label}</p>
                      <p className="text-sm font-semibold text-text-primary mt-1 min-h-[20px]">
                        {display ? formatDate(display as string, i18n.language, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </p>
                      {item.inherited && !item.value && (
                        <p className="text-[10px] text-text-muted mt-0.5">{t('programDetail.dates.fromCatalogue')}</p>
                      )}
                      <input
                        type="date"
                        value={item.value}
                        onChange={e => handleDateUpdate(item.field, e.target.value)}
                        disabled={saving}
                        aria-label={item.label}
                        className="mt-2 w-full rounded border border-border bg-background px-2 py-1 text-xs text-text-secondary focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-none"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notes — main textarea + entries */}
            <div className="rounded-xl border border-border bg-surface p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-text-primary">{t('programDetail.notes.title')}</h2>
                <button
                  onClick={() => setShowAddNote(true)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-brand-primary hover:text-brand-primary/80 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {t('programDetail.notes.add')}
                </button>
              </div>

              {/* Main notes */}
              {editingNotes ? (
                <div className="mb-4">
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm text-text-primary bg-background focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-none resize-none"
                    placeholder={t('programDetail.notes.placeholder')}
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button onClick={() => { setNotes(program.notes || ''); setEditingNotes(false); }} className="px-3 py-1.5 text-xs text-text-muted hover:text-text-primary">
                      {t('common.cancel')}
                    </button>
                    <button onClick={handleSaveNotes} disabled={saving} className="px-3 py-1.5 bg-brand-primary text-white rounded-lg text-xs font-medium hover:bg-brand-primary/90 disabled:opacity-50">
                      {saving ? t('common.saving') : t('common.save')}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setEditingNotes(true)}
                  className="mb-4 p-3 bg-elevated rounded-lg cursor-pointer hover:bg-elevated/80 transition-colors min-h-[60px]"
                >
                  {notes
                    ? <p className="text-sm text-text-secondary whitespace-pre-wrap">{notes}</p>
                    : <p className="text-sm text-text-muted">{t('programDetail.notes.empty')}</p>
                  }
                </div>
              )}

              {/* Add note form */}
              {showAddNote && (
                <div className="mb-4 p-4 bg-brand-primary/5 rounded-lg border border-brand-primary/20">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {Object.entries(NOTE_CATEGORIES).map(([key, { icon, labelKey, color }]) => (
                      <button
                        key={key}
                        onClick={() => setNewNoteCategory(key)}
                        className={cn('flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors', newNoteCategory === key ? color : 'bg-surface text-text-secondary hover:bg-elevated')}
                      >
                        <span>{icon}</span>
                        <span>{t(labelKey)}</span>
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={newNoteContent}
                    onChange={e => setNewNoteContent(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text-primary bg-background focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-none resize-none"
                    placeholder={t('programDetail.notes.entryPlaceholder')}
                    autoFocus
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button onClick={() => { setShowAddNote(false); setNewNoteContent(''); }} className="px-3 py-1.5 text-xs text-text-muted hover:text-text-primary">
                      {t('common.cancel')}
                    </button>
                    <button onClick={handleAddNoteEntry} disabled={!newNoteContent.trim() || saving} className="px-3 py-1.5 bg-brand-primary text-white rounded-lg text-xs font-medium hover:bg-brand-primary/90 disabled:opacity-50">
                      {t('programDetail.notes.add')}
                    </button>
                  </div>
                </div>
              )}

              {/* Note entries */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {sortedNoteEntries.map(entry => {
                  const category = NOTE_CATEGORIES[entry.category as keyof typeof NOTE_CATEGORIES] || NOTE_CATEGORIES.general;
                  return (
                    <div key={entry.id} className={cn('p-3 rounded-lg border group', entry.pinned ? 'border-status-warning/30 bg-status-warning/5' : 'border-border bg-elevated')}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-md', category.color)}>
                          {category.icon} {t(category.labelKey)}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleTogglePin(entry.id)} className={cn('p-1 rounded text-xs', entry.pinned ? 'text-status-warning' : 'text-text-muted hover:text-status-warning')} title={entry.pinned ? t('programDetail.notes.unpin') : t('programDetail.notes.pin')}>
                            <svg className="w-3.5 h-3.5" fill={entry.pinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                          </button>
                          <button onClick={() => handleDeleteNoteEntry(entry.id)} className="p-1 rounded text-text-muted hover:text-status-danger">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-text-secondary">{entry.content}</p>
                      <p className="text-[11px] text-text-muted mt-1">
                        {formatDate(entry.created_at, i18n.language, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                  );
                })}
                {sortedNoteEntries.length === 0 && !showAddNote && (
                  <p className="text-center text-sm text-text-muted py-4">{t('programDetail.notes.emptyEntries')}</p>
                )}
              </div>
            </div>

          </div>

          {/* Right: actions panel (1/3) */}
          <div className="space-y-5">

            {/* Document checklist */}
            <div className="rounded-xl border border-border bg-surface p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-text-primary">{t('programDetail.checklist.title')}</h2>
                <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', progressPercent === 100 ? 'bg-status-success/10 text-status-success' : 'bg-elevated text-text-secondary')}>
                  {completedItems}/{totalItems}
                </span>
              </div>

              {/* Progress bar — solid brand-primary, no gradient */}
              <div className="h-1.5 bg-elevated rounded-full mb-4 overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', progressPercent === 100 ? 'bg-status-success' : 'bg-brand-primary')}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="space-y-1">
                {program.document_checklist?.map((item, index) => (
                  <div key={item.id || index} className="flex items-center justify-between py-2 px-1 rounded-lg hover:bg-elevated/60 group">
                    <label className="flex items-center flex-1 cursor-pointer gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={e => handleChecklistChange(index, e.target.checked)}
                        className="w-4 h-4 text-brand-primary rounded border-border focus:ring-brand-primary flex-shrink-0"
                      />
                      <span className={cn('text-sm truncate', item.completed ? 'text-text-muted line-through' : 'text-text-primary')}>
                        {item.name}
                      </span>
                      {item.required && (
                        <span className="text-[10px] font-medium text-status-danger bg-status-danger/10 px-1.5 py-0.5 rounded flex-shrink-0">
                          {t('programDetail.checklist.required')}
                        </span>
                      )}
                    </label>
                    {item.id && (
                      <button
                        onClick={() => handleDeleteChecklistItem(item.id!)}
                        className="text-text-muted/40 hover:text-status-danger p-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {showAddItem ? (
                <div className="mt-3 p-3 bg-elevated rounded-lg">
                  <input
                    type="text"
                    value={newItemName}
                    onChange={e => setNewItemName(e.target.value)}
                    placeholder={t('programDetail.checklist.placeholder')}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text-primary bg-background focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-none"
                    onKeyDown={e => e.key === 'Enter' && handleAddChecklistItem()}
                    autoFocus
                  />
                  <label className="mt-2 flex items-center gap-2 text-xs text-text-secondary">
                    <input type="checkbox" checked={newItemRequired} onChange={e => setNewItemRequired(e.target.checked)} className="h-3.5 w-3.5 rounded border-border text-brand-primary" />
                    {t('programDetail.checklist.requiredToggle')}
                  </label>
                  <div className="flex justify-end gap-2 mt-2">
                    <button onClick={() => { setShowAddItem(false); setNewItemName(''); setNewItemRequired(true); }} className="px-2.5 py-1.5 text-xs text-text-muted hover:text-text-primary">
                      {t('common.cancel')}
                    </button>
                    <button onClick={handleAddChecklistItem} disabled={!newItemName.trim() || saving} className="px-2.5 py-1.5 bg-brand-primary text-white rounded-lg text-xs font-medium disabled:opacity-50">
                      {t('common.add')}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddItem(true)}
                  className="mt-3 w-full py-2 text-xs font-medium text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {t('programDetail.checklist.addCustom')}
                </button>
              )}
            </div>

            {/* Reminders */}
            <div className="rounded-xl border border-border bg-surface p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-text-primary">{t('programDetail.reminders.title')}</p>
                  <p className="text-xs text-text-muted mt-0.5">{t('programDetail.reminders.subtitle')}</p>
                </div>
                <label className="flex items-center gap-2 text-xs text-text-secondary">
                  <input
                    type="checkbox"
                    checked={program.reminders_enabled !== false}
                    onChange={e => handleReminderToggle(e.target.checked)}
                    disabled={saving}
                    className="h-3.5 w-3.5 rounded border-border text-brand-primary focus:ring-brand-primary"
                  />
                  {t('programDetail.reminders.enabled')}
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {reminderOptions.map(offset => (
                  <button
                    key={offset}
                    onClick={() => handleReminderOffsetToggle(offset)}
                    disabled={saving || program.reminders_enabled === false}
                    className={cn('rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50', reminderOffsets.includes(offset) ? 'bg-brand-primary text-white' : 'bg-elevated text-text-secondary hover:bg-border')}
                  >
                    {t('programDetail.reminders.daysBefore', { count: offset })}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Share journey prompt — no gradient, brand-primary/5 tint */}
        {(program.status === 'accepted' || program.status === 'rejected') && !Boolean(program.shared_as_experience) && (
          <div className="mt-6 rounded-xl border border-border bg-brand-primary/5 p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center flex-shrink-0" aria-hidden="true">
                {program.status === 'accepted'
                  ? <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>
                  : <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
                }
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-text-primary text-sm">
                  {program.status === 'accepted' ? t('programDetail.share.acceptedTitle') : t('programDetail.share.rejectedTitle')}
                </h3>
                <p className="text-sm text-text-secondary mt-1">{t('programDetail.share.subtitle')}</p>
                <Link
                  to={`/experiences/share/${program.id}`}
                  className="inline-flex items-center mt-3 px-4 py-2 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-brand-primary/90 transition-colors"
                >
                  {t('programDetail.share.cta')}
                </Link>
              </div>
            </div>
          </div>
        )}

      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        title={t('programDetail.confirmRemoveTitle')}
        description={t('programDetail.confirmRemoveDescription', { name: programName })}
        confirmLabel={t('common.delete')}
        destructive
        busy={saving}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
      />
    </PageTransition>
  );
}
