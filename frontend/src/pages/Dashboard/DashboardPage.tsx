import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, ClipboardList, CalendarClock } from 'lucide-react';

import { trackerApi } from '../../api';
import type { TrackedProgram, TrackedProgramStatus } from '../../types';
import { Button, Card, CardContent, Spinner } from '../../components/ui';
import { ProgramCard } from '../../components/Tracker/ProgramCard';
import { DeadlineCalendar } from '../../components/Tracker/DeadlineCalendar';

function countByStatus(items: TrackedProgram[], status: TrackedProgramStatus) {
  return items.filter((i) => i.status === status).length;
}

export function DashboardPage() {
  const qc = useQueryClient();

  const { data: programs, isLoading: isProgramsLoading } = useQuery({
    queryKey: ['tracker', 'programs'],
    queryFn: () => trackerApi.list(),
  });

  const { data: deadlines } = useQuery({
    queryKey: ['tracker', 'deadlines', 30],
    queryFn: () => trackerApi.deadlines(30),
  });

  const { data: stats } = useQuery({
    queryKey: ['tracker', 'stats', 30],
    queryFn: () => trackerApi.stats(30),
  });

  const items = programs || [];

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: any }) => trackerApi.update(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tracker', 'programs'] });
      qc.invalidateQueries({ queryKey: ['tracker', 'deadlines'] });
      qc.invalidateQueries({ queryKey: ['tracker', 'stats'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => trackerApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tracker', 'programs'] });
      qc.invalidateQueries({ queryKey: ['tracker', 'deadlines'] });
      qc.invalidateQueries({ queryKey: ['tracker', 'stats'] });
    },
  });

  const derived = useMemo(() => {
    return {
      total: stats?.total ?? items.length,
      preparing: countByStatus(items, 'preparing'),
      submitted: countByStatus(items, 'submitted'),
      upcoming: stats?.upcoming_deadlines ?? (deadlines?.length || 0),
    };
  }, [stats, items, deadlines]);

  if (isProgramsLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="w-8 h-8 text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">داشبورد اپلای</h1>
          <p className="text-gray-600 text-sm mt-1">
            برنامه‌های خودت رو اضافه کن، وضعیت‌ها رو آپدیت کن، و ددلاین‌ها رو از دست نده.
          </p>
        </div>
        <Link to="/dashboard/programs/new">
          <Button>
            <Plus className="w-4 h-4" />
            افزودن برنامه
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="text-center py-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-50 rounded-full mb-3">
              <ClipboardList className="w-6 h-6 text-primary-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{derived.total}</div>
            <div className="text-sm text-gray-500">کل برنامه‌ها</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-full mb-3">
              <span className="text-xl">🛠️</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{derived.preparing}</div>
            <div className="text-sm text-gray-500">در حال آماده‌سازی</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
              <span className="text-xl">📨</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{derived.submitted}</div>
            <div className="text-sm text-gray-500">ارسال‌شده</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-3">
              <CalendarClock className="w-6 h-6 text-red-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{derived.upcoming}</div>
            <div className="text-sm text-gray-500">ددلاین‌های {stats?.window_days ?? 30} روز آینده</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">برنامه‌های من</h2>
          </div>

          {items.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12 space-y-3">
                <div className="text-4xl">🧭</div>
                <div className="text-gray-900 font-semibold">هنوز چیزی اضافه نکردی</div>
                <div className="text-sm text-gray-600">
                  با اضافه کردن اولین برنامه، داشبوردت جان می‌گیره.
                </div>
                <Link to="/dashboard/programs/new">
                  <Button>
                    <Plus className="w-4 h-4" />
                    افزودن اولین برنامه
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {items.map((p) => (
                <ProgramCard
                  key={p.id}
                  program={p}
                  isUpdating={updateMutation.isPending || deleteMutation.isPending}
                  onStatusChange={(id, next) =>
                    updateMutation.mutate({ id, patch: { status: next } })
                  }
                  onDelete={(id) => {
                    if (confirm('این برنامه از ترکرت حذف شود؟')) {
                      deleteMutation.mutate(id);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <DeadlineCalendar items={deadlines || []} />
        </div>
      </div>
    </div>
  );
}
