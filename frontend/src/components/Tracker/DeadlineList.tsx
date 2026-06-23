import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/cn';
import { formatDate } from '../../lib/format';
import type { DeadlineItem } from '../../types';

interface DeadlineListProps {
  deadlines: DeadlineItem[];
}

function deadlineTone(daysUntil: number) {
  if (daysUntil < 0) return 'text-status-danger';
  if (daysUntil === 0) return 'text-status-danger';
  if (daysUntil <= 7) return 'text-status-danger';
  if (daysUntil <= 30) return 'text-status-warning';
  return 'text-text-primary';
}

function deadlineLabel(t: ReturnType<typeof useTranslation>['t'], daysUntil: number) {
  if (daysUntil < 0) return t('deadlines.overdue', { count: Math.abs(daysUntil) });
  if (daysUntil === 0) return t('deadlines.today');
  if (daysUntil === 1) return t('deadlines.tomorrow');
  return t('deadlines.daysAway', { count: daysUntil });
}

export function DeadlineList({ deadlines }: DeadlineListProps) {
  const { t, i18n } = useTranslation();

  if (deadlines.length === 0) {
    return (
      <p className="text-sm text-text-muted text-center py-4">
        {t('deadlines.empty')}
      </p>
    );
  }
  
  return (
    <motion.div
      className="space-y-3"
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
    >
      {deadlines.map((deadline) => (
        <motion.div
          key={deadline.id}
          variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
          className="flex items-center justify-between py-2 border-b border-border last:border-0"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text-primary truncate">
              {deadline.program_name}
            </p>
            <p className="text-xs text-text-muted truncate">{deadline.university_name}</p>
          </div>
          <div className="ms-4 text-end">
            <p className={cn('text-sm font-medium', deadlineTone(deadline.days_until))}>
              {deadlineLabel(t, deadline.days_until)}
            </p>
            <p className="text-xs text-text-muted">
              {formatDate(deadline.deadline, i18n.language, { month: 'short', day: 'numeric' })}
            </p>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
