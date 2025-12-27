import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Save } from 'lucide-react';

import { trackerApi } from '../../api';
import type { ChecklistItem, TrackedProgram } from '../../types';
import { Button, Card, CardContent, Spinner } from '../../components/ui';

function safeChecklist(items: ChecklistItem[] | null | undefined): ChecklistItem[] {
  if (Array.isArray(items)) return items;
  return [];
}

export function ProgramDetailPage() {
  const { id } = useParams();
  const programId = Number(id);

  const qc = useQueryClient();

  const { data: program, isLoading } = useQuery({
    queryKey: ['tracker', 'program', programId],
    queryFn: () => trackerApi.get(programId),
    enabled: Number.isFinite(programId) && programId > 0,
  });

  const [notes, setNotes] = useState<string>('');
  const [notesInitialized, setNotesInitialized] = useState(false);

  useEffect(() => {
    if (!notesInitialized && program) {
      setNotes(program.notes || '');
      setNotesInitialized(true);
    }
  }, [program, notesInitialized]);

  const checklist = useMemo(() => safeChecklist(program?.documents_checklist), [program]);

  const patchMutation = useMutation({
    mutationFn: (patch: Partial<TrackedProgram>) => trackerApi.update(programId, patch as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tracker', 'programs'] });
      qc.invalidateQueries({ queryKey: ['tracker', 'deadlines'] });
      qc.invalidateQueries({ queryKey: ['tracker', 'stats'] });
      qc.invalidateQueries({ queryKey: ['tracker', 'program', programId] });
    },
  });

  const checklistMutation = useMutation({
    mutationFn: (items: ChecklistItem[]) => trackerApi.updateChecklist(programId, items),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tracker', 'program', programId] });
      qc.invalidateQueries({ queryKey: ['tracker', 'programs'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="w-8 h-8 text-primary-600" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="space-y-4">
        <div className="text-gray-700">برنامه پیدا نشد.</div>
        <Link to="/dashboard" className="text-primary-600">بازگشت به داشبورد</Link>
      </div>
    );
  }

  const title = program.course_name || program.custom_program_name || '—';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-600 mt-1">
            {program.university_name} • {program.country}
          </p>
        </div>
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-gray-700">
          بازگشت
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">یادداشت</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
              placeholder="یادداشت خصوصی..."
            />
            <div className="flex justify-end mt-2">
              <Button
                variant="secondary"
                onClick={() => patchMutation.mutate({ notes: notes.trim() ? notes : null } as any)}
                disabled={patchMutation.isPending}
              >
                <Save className="w-4 h-4" />
                ذخیره
              </Button>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <div className="text-sm font-medium text-gray-900 mb-3">چک‌لیست مدارک</div>
            {checklist.length === 0 ? (
              <div className="text-sm text-gray-500">چک‌لیستی ثبت نشده.</div>
            ) : (
              <div className="space-y-2">
                {checklist.map((it, idx) => (
                  <label key={`${it.name}-${idx}`} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={it.done}
                      onChange={(e) => {
                        const next = checklist.map((x, i) => (i === idx ? { ...x, done: e.target.checked } : x));
                        checklistMutation.mutate(next);
                      }}
                    />
                    <span>{it.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
