import type { DeadlineItem } from '../../types';

interface DeadlineListProps {
  deadlines: DeadlineItem[];
}

export function DeadlineList({ deadlines }: DeadlineListProps) {
  if (deadlines.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-4">
        No upcoming deadlines in the next 30 days
      </p>
    );
  }
  
  return (
    <div className="space-y-3">
      {deadlines.map((deadline) => (
        <div
          key={deadline.id}
          className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 truncate">
              {deadline.program_name}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {deadline.university_name}
            </p>
          </div>
          <div className="ml-4 text-right">
            <p className={`text-sm font-medium ${
              deadline.days_until <= 7
                ? 'text-red-600'
                : deadline.days_until <= 14
                ? 'text-orange-600'
                : 'text-gray-900'
            }`}>
              {deadline.days_until === 0
                ? 'Today!'
                : deadline.days_until === 1
                ? 'Tomorrow'
                : `${deadline.days_until} days`}
            </p>
            <p className="text-xs text-gray-500">
              {new Date(deadline.deadline).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
