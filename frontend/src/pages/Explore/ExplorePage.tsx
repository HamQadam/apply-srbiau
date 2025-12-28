import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { courseApi, universityApi, trackerApi } from '../../api/services';
import { useAuth } from '../../contexts/AuthContext';
import type { Course, DegreeLevel } from '../../types';

export function ExplorePage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [countries, setCountries] = useState<Array<{ country: string; count: number }>>([]);
  const [fields, setFields] = useState<Array<{ field: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<number | null>(null);
  
  // Filters
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('');
  const [field, setField] = useState('');
  const [degreeLevel, setDegreeLevel] = useState<DegreeLevel | ''>('');
  const [tuitionFreeOnly, setTuitionFreeOnly] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    searchCourses();
  }, [query, country, field, degreeLevel, tuitionFreeOnly]);

  const loadInitialData = async () => {
    try {
      const [countriesData, fieldsData] = await Promise.all([
        universityApi.getCountries(),
        courseApi.getFields(),
      ]);
      setCountries(countriesData);
      setFields(fieldsData);
    } catch (err) {
      console.error('Failed to load filters:', err);
    }
  };

  const searchCourses = async () => {
    setLoading(true);
    try {
      const data = await courseApi.search({
        query: query || undefined,
        country: country || undefined,
        field: field || undefined,
        degree_level: degreeLevel || undefined,
        tuition_free_only: tuitionFreeOnly,
        limit: 50,
      });
      setCourses(data);
    } catch (err) {
      console.error('Failed to search:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToTracker = async (courseId: number) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/explore' } });
      return;
    }

    setAdding(courseId);
    try {
      await trackerApi.addProgram({ course_id: courseId });
      navigate('/dashboard');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add');
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Explore Programs</h1>
        <p className="text-gray-600 mt-1">Find your perfect program and add it to your tracker</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search programs..."
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Countries</option>
            {countries.map((c) => (
              <option key={c.country} value={c.country}>
                {c.country} ({c.count})
              </option>
            ))}
          </select>
          
          <select
            value={field}
            onChange={(e) => setField(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Fields</option>
            {fields.map((f) => (
              <option key={f.field} value={f.field}>
                {f.field} ({f.count})
              </option>
            ))}
          </select>
          
          <select
            value={degreeLevel}
            onChange={(e) => setDegreeLevel(e.target.value as DegreeLevel | '')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Degrees</option>
            <option value="bachelor">Bachelor</option>
            <option value="master">Master</option>
            <option value="phd">PhD</option>
          </select>
          
          <label className="flex items-center space-x-2 px-3 py-2">
            <input
              type="checkbox"
              checked={tuitionFreeOnly}
              onChange={(e) => setTuitionFreeOnly(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Tuition-free only</span>
          </label>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-gray-100 rounded-xl h-48 animate-pulse"></div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-5xl">🔍</span>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No programs found</h3>
          <p className="mt-2 text-gray-600">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  course.degree_level === 'master'
                    ? 'bg-blue-100 text-blue-700'
                    : course.degree_level === 'phd'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {course.degree_level.toUpperCase()}
                </span>
                {course.university_ranking_qs && (
                  <span className="text-xs text-gray-500">QS #{course.university_ranking_qs}</span>
                )}
              </div>
              
              <h3 className="font-semibold text-gray-900 mb-1">{course.name}</h3>
              <p className="text-sm text-gray-600 mb-3">
                {course.university_name} · {course.university_country}
              </p>
              
              <div className="flex flex-wrap gap-2 mb-4 text-xs">
                {course.is_tuition_free ? (
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">
                    Tuition-free
                  </span>
                ) : course.tuition_fee_amount ? (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                    €{course.tuition_fee_amount.toLocaleString()}/year
                  </span>
                ) : null}
                
                {course.deadline_fall && (
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full">
                    Due: {new Date(course.deadline_fall).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
                
                {course.scholarships_available && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                    Scholarships
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleAddToTracker(course.id)}
                  disabled={adding === course.id}
                  className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {adding === course.id ? 'Adding...' : '+ Add to Tracker'}
                </button>
                {course.program_url && (
                  <a
                    href={course.program_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50"
                  >
                    ↗
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
