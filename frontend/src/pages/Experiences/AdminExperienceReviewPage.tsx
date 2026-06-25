import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Navigate } from 'react-router-dom';
import { experiencesApi } from '../../api/services';
import { PageTransition } from '../../components/Transitions/PageTransition';
import { Skeleton } from '../../components/Feedback/Skeleton';
import { useAuth } from '../../contexts/AuthContext';
import type { ExperienceModerationStatus, ExperienceRecord } from '../../types';

const statuses: ExperienceModerationStatus[] = ['submitted', 'approved', 'rejected', 'hidden'];

export function AdminExperienceReviewPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ExperienceRecord[]>([]);
  const [status, setStatus] = useState<ExperienceModerationStatus>('submitted');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    experiencesApi.getReviewQueue(status)
      .then(setItems)
      .catch((err) => {
        console.error('Failed to load review queue:', err);
        toast.error('Could not load review queue');
      })
      .finally(() => setLoading(false));
  }, [status]);

  if (!user?.is_admin) return <Navigate to="/" replace />;

  const moderate = async (id: number, moderation_status: ExperienceModerationStatus) => {
    setBusy(id);
    try {
      const updated = await experiencesApi.moderate(id, { moderation_status });
      setItems((prev) => prev.map((item) => item.id === id ? updated : item).filter((item) => item.moderation_status === status));
      toast.success(`Marked ${moderation_status}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update moderation status');
    } finally {
      setBusy(null);
    }
  };

  return (
    <PageTransition>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Experience review</h1>
            <p className="mt-1 text-sm text-text-muted">Approve, reject, or hide submitted applicant experiences.</p>
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value as ExperienceModerationStatus)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary">
            {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="space-y-3"><Skeleton className="h-36 rounded-lg" /><Skeleton className="h-36 rounded-lg" /></div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-surface p-10 text-center text-text-muted">No experiences in this queue.</div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <article key={item.id} className="rounded-lg border border-border bg-surface p-5 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="font-semibold text-text-primary">{item.program_name}</h2>
                    <p className="mt-1 text-sm text-text-muted">{item.university_name || 'Custom university'}{item.country ? ` · ${item.country}` : ''} · {item.application_year}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-text-muted">
                      <span>{item.visibility}</span>
                      <span>{item.status}</span>
                      {item.pii_warning_accepted && <span className="text-status-success">PII confirmed</span>}
                      {item.source_tracked_program_id && <span>tracker #{item.source_tracked_program_id}</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button disabled={busy === item.id} onClick={() => moderate(item.id, 'approved')} className="rounded-lg bg-status-success px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Approve</button>
                    <button disabled={busy === item.id} onClick={() => moderate(item.id, 'rejected')} className="rounded-lg bg-status-danger px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Reject</button>
                    <button disabled={busy === item.id} onClick={() => moderate(item.id, 'hidden')} className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary disabled:opacity-50">Hide</button>
                  </div>
                </div>
                <p className="mt-4 whitespace-pre-line text-sm leading-6 text-text-secondary">{item.notes}</p>
                {item.interview_experience && <p className="mt-3 whitespace-pre-line text-sm leading-6 text-text-secondary"><span className="font-medium text-text-primary">Interview: </span>{item.interview_experience}</p>}
                {item.advice_for_applicants && <p className="mt-3 whitespace-pre-line text-sm leading-6 text-text-secondary"><span className="font-medium text-text-primary">Advice: </span>{item.advice_for_applicants}</p>}
              </article>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
