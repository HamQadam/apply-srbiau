import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Plus } from 'lucide-react';

import { trackerApi } from '../../api';
import type {
  ChecklistItem,
  CourseWithUniversity,
  TrackedProgramPriority,
  TrackedProgramStatus,
} from '../../types';
import { Button, Card, CardContent, Select } from '../../components/ui';
import { ProgramSearch } from '../../components/Tracker/ProgramSearch';

const PRIORITY_OPTIONS: Array<{ value: TrackedProgramPriority; label: string }> = [
  { value: 'safety', label: 'سیفتی' },
  { value: 'target', label: 'تارگت' },
  { value: 'reach', label: 'ریچ' },
];

const STATUS_OPTIONS: Array<{ value: TrackedProgramStatus; label: string }> = [
  { value: 'researching', label: 'در حال بررسی' },
  { value: 'preparing', label: 'در حال آماده‌سازی' },
  { value: 'submitted', label: 'ارسال‌شده' },
  { value: 'interview', label: 'مصاحبه' },
  { value: 'accepted', label: 'قبول‌شده' },
  { value: 'rejected', label: 'رد‌شده' },
  { value: 'waitlisted', label: 'لیست انتظار' },
];

function defaultChecklist(): ChecklistItem[] {
  return [
    { name: 'SOP', done: false },
    { name: 'CV', done: false },
    { name: 'Transcript', done: false },
    { name: 'LOR', done: false },
    { name: 'Portfolio', done: false },
    { name: 'Test Score', done: false },
  ];
}

export function AddProgramPage() {
  const nav = useNavigate();
  const qc = useQueryClient();

  const [mode, setMode] = useState<'database' | 'custom'>('database');
  const [selected, setSelected] = useState<CourseWithUniversity | null>(null);

  // Shared form fields
  const [deadline, setDeadline] = useState<string>('');
  const [status, setStatus] = useState<TrackedProgramStatus>('researching');
  const [priority, setPriority] = useState<TrackedProgramPriority>('target');
  const [notes, setNotes] = useState<string>('');

  // Custom fields
  const [customProgramName, setCustomProgramName] = useState('');
  const [customUniversityName, setCustomUniversityName] = useState('');
  const [customCountry, setCustomCountry] = useState('');

  const inferred = useMemo(() => {
    if (!selected) return null;
    return {
      course_id: selected.id,
      university_name: selected.university.name,
      country: selected.university.country,
      suggested_deadline: selected.application_deadline || '',
    };
  }, [selected]);

  const createMutation = useMutation({
    mutationFn: (payload: any) => trackerApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tracker', 'programs'] });
      qc.invalidateQueries({ queryKey: ['tracker', 'deadlines'] });
      qc.invalidateQueries({ queryKey: ['tracker', 'stats'] });
      nav('/dashboard');
    },
  });

  const canSubmit = useMemo(() => {
    if (mode === 'database') return Boolean(selected);
    return Boolean(customProgramName.trim() && customUniversityName.trim() && customCountry.trim());
  }, [mode, selected, customProgramName, customUniversityName, customCountry]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">افزودن برنامه</h1>
          <p className="text-sm text-gray-600 mt-1">
            می‌تونی از دیتابیس انتخاب کنی یا برنامه رو دستی اضافه کنی.
          </p>
        </div>
        <Button variant="ghost" onClick={() => nav('/dashboard')}
          className="text-gray-700">
          بازگشت
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className={`px-4 py-2 rounded-lg text-sm font-medium border ${
            mode === 'database' ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-200'
          }`}
          onClick={() => setMode('database')}
        >
          از دیتابیس
        </button>
        <button
          type="button"
          className={`px-4 py-2 rounded-lg text-sm font-medium border ${
            mode === 'custom' ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-200'
          }`}
          onClick={() => setMode('custom')}
        >
          دستی
        </button>
      </div>

      <Card>
        <CardContent className="space-y-5">
          {mode === 'database' ? (
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-900">جستجو در برنامه‌ها</div>
              <ProgramSearch
                onSelect={(c: CourseWithUniversity) => {
                  setSelected(c);
                  if (!deadline && c.application_deadline) setDeadline(c.application_deadline);
                }}
              />

              {inferred && (
                <div className="text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-lg p-3">
                  <div className="font-medium">انتخاب شد:</div>
                  <div className="mt-1">
                    {selected?.course_name} — {inferred.university_name} ({inferred.country})
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">نام برنامه</label>
                <input
                  value={customProgramName}
                  onChange={(e) => setCustomProgramName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                  placeholder="مثلاً: Computer Science (MSc)"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">نام دانشگاه</label>
                <input
                  value={customUniversityName}
                  onChange={(e) => setCustomUniversityName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                  placeholder="مثلاً: TU Delft"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">کشور</label>
                <input
                  value={customCountry}
                  onChange={(e) => setCustomCountry(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                  placeholder="مثلاً: Netherlands"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">ددلاین</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">اولویت</label>
              <Select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                options={PRIORITY_OPTIONS}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">وضعیت</label>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                options={STATUS_OPTIONS}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 mb-1">یادداشت</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
                placeholder="یادداشت خصوصی، لینک‌ها، TODOها..."
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              disabled={!canSubmit || createMutation.isPending}
              onClick={() => {
                const payload: any = {
                  status,
                  priority,
                  notes: notes || null,
                  deadline: deadline || null,
                  documents_checklist: defaultChecklist(),
                };

                if (mode === 'database' && inferred) {
                  payload.course_id = inferred.course_id;
                } else {
                  payload.custom_program_name = customProgramName.trim();
                  payload.university_name = customUniversityName.trim();
                  payload.country = customCountry.trim();
                }

                createMutation.mutate(payload);
              }}
            >
              <Plus className="w-4 h-4" />
              افزودن
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
