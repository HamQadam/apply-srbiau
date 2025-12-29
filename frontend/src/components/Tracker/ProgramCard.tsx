import { Link } from 'react-router-dom';
import type { TrackedProgram } from '../../types';
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS, getMatchScoreColor } from '../../types';

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
  
  // Document progress
  const checklist = program.document_checklist || [];
  const completedDocs = checklist.filter(item => item.completed).length;
  const totalDocs = checklist.length;
  const progressPercent = totalDocs > 0 ? Math.round((completedDocs / totalDocs) * 100) : 0;
  
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-indigo-500/5 transition-all group">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Match Score Badge (if available) */}
          {program.match_score && (
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mb-2 ${getMatchScoreColor(program.match_score)}`}>
              <span>{program.match_score}% match</span>
            </div>
          )}
          
          {/* Program & University */}
          <Link
            to={`/dashboard/programs/${program.id}`}
            className="block group-hover:text-indigo-600 transition-colors"
          >
            <h3 className="font-semibold text-gray-900 truncate">{programName}</h3>
          </Link>
          <p className="text-sm text-gray-500 mt-0.5">
            {universityName}
            {country && <span className="text-gray-400"> · {country}</span>}
          </p>
          
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {/* Status */}
            <select
              value={program.status}
              onChange={(e) => onStatusChange(program.id, e.target.value)}
              className={`text-xs font-medium px-2.5 py-1 rounded-lg cursor-pointer ${STATUS_COLORS[program.status]}`}
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            
            {/* Priority */}
            <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${PRIORITY_COLORS[program.priority]}`}>
              {PRIORITY_LABELS[program.priority]}
            </span>
            
            {/* Ranking if available */}
            {program.university_ranking_qs && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                QS #{program.university_ranking_qs}
              </span>
            )}
          </div>
        </div>
        
        {/* Right side - Deadline & Actions */}
        <div className="text-right ml-4 flex flex-col items-end gap-2">
          {deadline && (
            <div className={`px-3 py-1.5 rounded-xl text-sm font-medium ${
              daysUntilDeadline !== null && daysUntilDeadline <= 7
                ? 'bg-red-100 text-red-700'
                : daysUntilDeadline !== null && daysUntilDeadline <= 30
                ? 'bg-orange-100 text-orange-700'
                : 'bg-gray-100 text-gray-700'
            }`}>
              <div>{new Date(deadline).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}</div>
              {daysUntilDeadline !== null && daysUntilDeadline > 0 && (
                <div className="text-xs opacity-75">
                  {daysUntilDeadline}d left
                </div>
              )}
            </div>
          )}
          
          <button
            onClick={() => onDelete(program.id)}
            className="text-gray-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
            title="Remove from tracker"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Document Progress */}
      {totalDocs > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-gray-500">Documents</span>
            <span className="font-medium text-gray-700">{completedDocs}/{totalDocs}</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${
                progressPercent === 100 
                  ? 'bg-gradient-to-r from-emerald-500 to-green-500' 
                  : 'bg-gradient-to-r from-indigo-500 to-purple-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Notes preview if any */}
      {program.notes && (
        <p className="mt-4 text-sm text-gray-500 truncate pt-4 border-t border-gray-100">
          📝 {program.notes}
        </p>
      )}
    </div>
  );
}
