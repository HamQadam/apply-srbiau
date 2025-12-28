import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { courseApi, trackerApi } from '../../api/services';
import type { CourseSummary, Priority, IntakePeriod } from '../../types';

export function AddProgramPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'search' | 'custom'>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CourseSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CourseSummary | null>(null);
  
  // Custom entry fields
  const [customProgram, setCustomProgram] = useState('');
  const [customUniversity, setCustomUniversity] = useState('');
  const [customCountry, setCustomCountry] = useState('');
  const [customDeadline, setCustomDeadline] = useState('');
  
  // Common fields
  const [priority, setPriority] = useState<Priority>('target');
  const [intake, setIntake] = useState<IntakePeriod | ''>('fall_2025');
  const [notes, setNotes] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const courses = await courseApi.autocomplete(query);
        setResults(courses);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setSearching(false);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [query]);
  
  const handleSelectCourse = (course: CourseSummary) => {
    setSelectedCourse(course);
    setQuery('');
    setResults([]);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    
    try {
      if (mode === 'search' && selectedCourse) {
        await trackerApi.addProgram({
          course_id: selectedCourse.id,
          priority,
          intake: intake || undefined,
          notes: notes || undefined,
        });
      } else if (mode === 'custom' && customProgram && customUniversity) {
        await trackerApi.addProgram({
          custom_program_name: customProgram,
          custom_university_name: customUniversity,
          custom_country: customCountry || undefined,
          custom_deadline: customDeadline || undefined,
          priority,
          intake: intake || undefined,
          notes: notes || undefined,
        });
      } else {
        setError('Please select a program or fill in custom details');
        setSubmitting(false);
        return;
      }
      
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add program');
    } finally {
      setSubmitting(false);
    }
  };
  
  const canSubmit = mode === 'search' 
    ? !!selectedCourse 
    : (customProgram && customUniversity);
  
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Add Program to Tracker</h1>
        <p className="text-gray-600 mt-1">
          Search our database or add a custom program
        </p>
      </div>
      
      {/* Mode Toggle */}
      <div className="flex space-x-2 mb-6">
        <button
          onClick={() => setMode('search')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === 'search'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Search Programs
        </button>
        <button
          onClick={() => setMode('custom')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === 'custom'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Add Custom
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {mode === 'search' ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Find Program</h2>
            
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by program name or university..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searching && (
                <div className="absolute right-3 top-3">
                  <div className="animate-spin w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
                </div>
              )}
              
              {/* Search Results Dropdown */}
              {results.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {results.map((course) => (
                    <button
                      key={course.id}
                      type="button"
                      onClick={() => handleSelectCourse(course)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                    >
                      <div className="font-medium text-gray-900">{course.name}</div>
                      <div className="text-sm text-gray-600">
                        {course.university_name} · {course.university_country}
                        {course.deadline_fall && (
                          <span className="text-gray-400">
                            {' '}· Deadline: {new Date(course.deadline_fall).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Selected Course */}
            {selectedCourse && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-blue-900">{selectedCourse.name}</div>
                    <div className="text-sm text-blue-700">
                      {selectedCourse.university_name} · {selectedCourse.university_country}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCourse(null)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Change
                  </button>
                </div>
              </div>
            )}
            
            {!selectedCourse && query.length === 0 && (
              <p className="mt-4 text-sm text-gray-500 text-center">
                Start typing to search for programs
              </p>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Custom Program</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Program Name *
                </label>
                <input
                  type="text"
                  value={customProgram}
                  onChange={(e) => setCustomProgram(e.target.value)}
                  placeholder="e.g., MSc Computer Science"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required={mode === 'custom'}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  University Name *
                </label>
                <input
                  type="text"
                  value={customUniversity}
                  onChange={(e) => setCustomUniversity(e.target.value)}
                  placeholder="e.g., Technical University of Munich"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required={mode === 'custom'}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={customCountry}
                    onChange={(e) => setCustomCountry(e.target.value)}
                    placeholder="e.g., Germany"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Application Deadline
                  </label>
                  <input
                    type="date"
                    value={customDeadline}
                    onChange={(e) => setCustomDeadline(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Common Fields */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Application Details</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="dream">Dream (Reach)</option>
                  <option value="target">Target (Good fit)</option>
                  <option value="safety">Safety (Backup)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Intake
                </label>
                <select
                  value={intake}
                  onChange={(e) => setIntake(e.target.value as IntakePeriod | '')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Not sure yet</option>
                  <option value="fall_2025">Fall 2025</option>
                  <option value="spring_2026">Spring 2026</option>
                  <option value="fall_2026">Fall 2026</option>
                  <option value="spring_2027">Spring 2027</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes about this application..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>
          </div>
        </div>
        
        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}
        
        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2 text-gray-700 font-medium hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Adding...' : 'Add to Tracker'}
          </button>
        </div>
      </form>
    </div>
  );
}
