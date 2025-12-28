import { Link } from 'react-router-dom';
import { CalendarDays, Trash2, ArrowUpRight } from 'lucide-react';
import type { TrackedProgram, TrackedProgramPriority, TrackedProgramStatus } from '../../types';
import { Badge, Button, Card, CardContent } from '../ui';
import { StatusDropdown } from './StatusDropdown';

function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split('-').map((x) => Number(x));
  if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date(dateStr);
}

function formatDate(dateStr: string) {
  try {
    const d = parseLocalDate(dateStr);
    return new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'short', day: 'numeric' }).format(d);
  } catch {
    return dateStr;
  }
}

function daysUntil(dateStr: string) {
  const now = new Date();
  const target = parseLocalDate(dateStr);
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function priorityBadge(priority: TrackedProgramPriority) {
  switch (priority) {
    case 'reach':
      return <Badge variant="info">ریچ</Badge>;
    case 'safety':
      return <Badge variant="success">سیفتی</Badge>;
    case 'target':
    default:
      return <Badge variant="default">تارگت</Badge>;
  }
}

export function ProgramCard({
  program,
  onStatusChange,
  onDelete,
  isUpdating,
}: {
  program: TrackedProgram;
  onStatusChange: (id: number, next: TrackedProgramStatus) => void;
  onDelete: (id: number) => void;
  isUpdating?: boolean;
}) {
  const title = program.course_name || program.custom_program_name || '—';
  const deadlineText = program.deadline ? formatDate(program.deadline) : '—';
  const dLeft = program.deadline ? daysUntil(program.deadline) : null;

  const checklistDone = program.documents_checklist?.filter((i) => i.done).length ?? 0;
  const checklistTotal = program.documents_checklist?.length ?? 0;

  return (
    <Card className="hover:border-primary-200">
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 truncate">{title}</h3>
              {priorityBadge(program.priority)}
            </div>
            <p className="text-sm text-gray-600 truncate">
              {program.university_name} • {program.country}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`/dashboard/programs/${program.id}`}
              className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700"
              title="جزئیات"
            >
              <ArrowUpRight className="w-4 h-4" />
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(program.id)}
              disabled={isUpdating}
              className="text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <div className="text-xs text-gray-500 mb-1">وضعیت</div>
            <StatusDropdown
              value={program.status}
              disabled={isUpdating}
              onChange={(next) => onStatusChange(program.id, next)}
            />
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">ددلاین</div>
            <div className="flex items-center gap-2 text-sm text-gray-800">
              <CalendarDays className="w-4 h-4 text-gray-400" />
              <span>{deadlineText}</span>
              {typeof dLeft === 'number' && isFinite(dLeft) && (
                <span className={`text-xs ${dLeft <= 7 ? 'text-red-600' : 'text-gray-500'}`}>
                  ({dLeft >= 0 ? `${dLeft} روز` : `${Math.abs(dLeft)} روز گذشته`})
                </span>
              )}
            </div>
          </div>
        </div>

        {(program.notes || checklistTotal > 0) && (
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
            {program.notes && <span className="truncate max-w-[38rem]">📝 {program.notes}</span>}
            {checklistTotal > 0 && (
              <span>
                ✅ چک‌لیست: {checklistDone}/{checklistTotal}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
