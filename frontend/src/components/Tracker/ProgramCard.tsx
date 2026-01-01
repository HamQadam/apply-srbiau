import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { formatDate } from '../../lib/format';
import type { TrackedProgram } from '../../types';
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS, getMatchScoreColor } from '../../types';

interface ProgramCardProps {
  program: TrackedProgram;
  onStatusChange: (id: number, status: string) => void;
  onDelete: (id: number) => void;
}

export function ProgramCard({ program, onStatusChange, onDelete }: ProgramCardProps) {
  const { t, i18n } = useTranslation();
  const programName = program.program_name || program.custom_program_name || t('program.unknown');
  const universityName = program.university_name || program.custom_university_name || t('program.unknownUniversity');
  const country = program.country || program.custom_country || '';
  
  const deadline = program.deadline || program.program_deadline;
  const daysUntilDeadline = deadline
    ? Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  
  // Document progress
  const checklist = program.document_checklist || [];
  const completedDocs = checklist.filter(item => item.completed).length;
  const totalDocs = checklist.length;
  const progressPercent = totalDocs > 0 ? Math.round((completedDocs / totalDocs) * 100) : 0;
  
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-surface rounded-2xl border border-border p-5 hover:shadow-lg hover:shadow-brand-primary/10 transition-all group"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Match Score Badge (if available) */}
          {program.match_score && (
            <div
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mb-2',
                getMatchScoreColor(program.match_score)
              )}
            >
              <span>{t('program.matchScore', { score: program.match_score })}</span>
            </div>
          )}
          
          {/* Program & University */}
          <Link
            to={`/dashboard/programs/${program.id}`}
            className="block group-hover:text-brand-primary transition-colors"
          >
            <h3 className="font-semibold text-text-primary truncate">{programName}</h3>
          </Link>
          <p className="text-sm text-text-muted mt-0.5">
            {universityName}
            {country && <span className="text-text-muted/70"> · {country}</span>}
          </p>
          
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {/* Status */}
            <select
              value={program.status}
              onChange={(e) => onStatusChange(program.id, e.target.value)}
              className={cn(
                'text-xs font-medium px-2.5 py-1 rounded-lg cursor-pointer',
                STATUS_COLORS[program.status]
              )}
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{t(label)}</option>
              ))}
            </select>
            
            {/* Priority */}
            <span className={cn('text-xs font-medium px-2.5 py-1 rounded-lg', PRIORITY_COLORS[program.priority])}>
              {t(PRIORITY_LABELS[program.priority])}
            </span>
            
            {/* Ranking if available */}
            {program.university_ranking_qs && (
              <span className="text-xs text-text-muted bg-elevated px-2 py-1 rounded-lg">
                {t('program.qsRank', { rank: program.university_ranking_qs })}
              </span>
            )}
          </div>
        </div>
        
        {/* Right side - Deadline & Actions */}
        <div className="text-end ms-4 flex flex-col items-end gap-2">
          {deadline && (
            <div
              className={cn(
                'px-3 py-1.5 rounded-xl text-sm font-medium',
                daysUntilDeadline !== null && daysUntilDeadline <= 7
                  ? 'bg-status-danger/10 text-status-danger'
                  : daysUntilDeadline !== null && daysUntilDeadline <= 30
                  ? 'bg-status-warning/10 text-status-warning'
                  : 'bg-elevated text-text-secondary'
              )}
            >
              <div>
                {formatDate(deadline, i18n.language, { month: 'short', day: 'numeric' })}
              </div>
              {daysUntilDeadline !== null && daysUntilDeadline > 0 && (
                <div className="text-xs opacity-75">{t('program.daysLeft', { count: daysUntilDeadline })}</div>
              )}
            </div>
          )}
          
          <motion.button
            onClick={() => onDelete(program.id)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="text-text-muted/40 hover:text-status-danger p-1.5 rounded-lg hover:bg-status-danger/10 transition-colors opacity-0 group-hover:opacity-100"
            title={t('program.remove')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </motion.button>
        </div>
      </div>
      
      {/* Document Progress */}
      {totalDocs > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-text-muted">{t('program.documents')}</span>
            <span className="font-medium text-text-secondary">
              {completedDocs}/{totalDocs}
            </span>
          </div>
          <div className="w-full h-2 bg-elevated rounded-full overflow-hidden">
            <div 
              className={cn(
                'h-full rounded-full transition-all',
                progressPercent === 100
                  ? 'bg-gradient-to-r from-status-success to-brand-accent'
                  : 'bg-gradient-to-r from-brand-primary to-brand-secondary'
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Notes preview if any */}
      {program.notes && (
        <p className="mt-4 text-sm text-text-muted truncate pt-4 border-t border-border">
          📝 {program.notes}
        </p>
      )}
    </motion.div>
  );
}
