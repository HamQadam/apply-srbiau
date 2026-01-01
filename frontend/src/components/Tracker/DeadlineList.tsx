import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/cn';
import { formatDate } from '../../lib/format';
import type { DeadlineItem } from '../../types';

interface DeadlineListProps {
  deadlines: DeadlineItem[];
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
            <p
              className={cn(
                'text-sm font-medium',
                deadline.days_until <= 7
                  ? 'text-status-danger'
                  : deadline.days_until <= 14
                  ? 'text-status-warning'
                  : 'text-text-primary'
              )}
            >
              {deadline.days_until === 0
                ? t('deadlines.today')
                : deadline.days_until === 1
                ? t('deadlines.tomorrow')
                : t('deadlines.daysAway', { count: deadline.days_until })}
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
