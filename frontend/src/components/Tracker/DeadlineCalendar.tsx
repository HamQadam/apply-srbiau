import { useMemo } from 'react';
import { Calendar } from 'lucide-react';
import type { TrackedProgram } from '../../types';
import { Card, CardContent } from '../ui';

function parseDate(dateStr: string): Date | null {
  const parts = dateStr.split('-').map((x) => Number(x));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const [y, m, d] = parts;
  const dt = new Date(y, m - 1, d);
  return isNaN(dt.getTime()) ? null : dt;
}

export function DeadlineCalendar({ items }: { items: TrackedProgram[] }) {
  const upcoming = useMemo(() => {
    return items
      .filter((i) => i.deadline)
      .map((i) => ({ ...i, _d: parseDate(i.deadline as string) }))
      .filter((i) => i._d)
      .sort((a, b) => (a._d!.getTime() - b._d!.getTime()))
      .slice(0, 8);
  }, [items]);

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900">ددلاین‌های نزدیک</h3>
        </div>

        {upcoming.length === 0 ? (
          <div className="text-sm text-gray-500">هیچ ددلاینی ثبت نشده است.</div>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((p: any) => (
              <li key={p.id} className="text-sm text-gray-700 flex justify-between gap-3">
                <span className="truncate">
                  {p.course_name || p.custom_program_name || '—'} — {p.university_name}
                </span>
                <span className="text-gray-500 whitespace-nowrap">{p.deadline}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
