import { Link } from 'react-router-dom';
import type { TrackedProgram } from '../../types';
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS } from '../../types';

interface ProgramCardProps {
  program: TrackedProgram;
  onStatusChange: (id: number, status: string) => void;
  onDelete: (id: number) => void;
}

export function ProgramCard({ program, onStatusChange, onDelete }: ProgramCardProps) {
  const programName = program.program_name || program.custom_program_name || 'Unknown Program';
  const universityName = program.university_name || program.custom_university_name || 'Unknown University';
  const country = program.country || program.custom_country || '';
  
  const deadline = program.deadline || program.program_deadline;
  const daysUntilDeadline = deadline
    ? Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Program & University */}
          <Link
            to={`/dashboard/programs/${program.id}`}
            className="block hover:underline"
          >
            <h3 className="font-semibold text-gray-900 truncate">{programName}</h3>
          </Link>
          <p className="text-sm text-gray-600 mt-0.5">
            {universityName}
            {country && <span className="text-gray-400"> · {country}</span>}
          </p>
          
          {/* Badges */}
          <div className="flex items-center space-x-2 mt-3">
            {/* Status */}
            <select
              value={program.status}
              onChange={(e) => onStatusChange(program.id, e.target.value)}
              className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${STATUS_COLORS[program.status]}`}
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            
            {/* Priority */}
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${PRIORITY_COLORS[program.priority]}`}>
              {PRIORITY_LABELS[program.priority]}
            </span>
            
            {/* Ranking if available */}
            {program.university_ranking_qs && (
              <span className="text-xs text-gray-500">
                QS #{program.university_ranking_qs}
              </span>
            )}
          </div>
        </div>
        
        {/* Right side - Deadline & Actions */}
        <div className="text-right ml-4">
          {deadline && (
            <div className="mb-2">
              <div className={`text-sm font-medium ${
                daysUntilDeadline !== null && daysUntilDeadline <= 7
                  ? 'text-red-600'
                  : daysUntilDeadline !== null && daysUntilDeadline <= 30
                  ? 'text-orange-600'
                  : 'text-gray-900'
              }`}>
                {new Date(deadline).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
              {daysUntilDeadline !== null && daysUntilDeadline > 0 && (
                <div className="text-xs text-gray-500">
                  {daysUntilDeadline} days left
                </div>
              )}
            </div>
          )}
          
          <button
            onClick={() => onDelete(program.id)}
            className="text-gray-400 hover:text-red-500 p-1"
            title="Remove from tracker"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Notes preview if any */}
      {program.notes && (
        <p className="mt-3 text-sm text-gray-500 truncate border-t border-gray-100 pt-3">
          📝 {program.notes}
        </p>
      )}
    </div>
  );
}
