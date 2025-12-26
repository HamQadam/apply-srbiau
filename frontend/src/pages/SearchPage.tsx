import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, Filter, Globe, Award } from 'lucide-react';
import { applicationsApi } from '../api';
import { 
  Card, 
  CardContent, 
  Input, 
  Select, 
  Spinner, 
  EmptyState,
  StatusBadge,
} from '../components/ui';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'interview', label: 'Interview' },
  { value: 'waitlisted', label: 'Waitlisted' },
];

const DEGREE_OPTIONS = [
  { value: '', label: 'All degrees' },
  { value: 'masters', label: "Master's" },
  { value: 'phd', label: 'PhD' },
  { value: 'mba', label: 'MBA' },
];

const YEAR_OPTIONS = [
  { value: '', label: 'All years' },
  ...Array.from({ length: 5 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return { value: String(year), label: String(year) };
  }),
];

export function SearchPage() {
  const [filters, setFilters] = useState({
    university: '',
    country: '',
    program: '',
    status: '',
    degree_level: '',
    year: '',
    scholarship_received: '',
  });

  const { data: applications, isLoading } = useQuery({
    queryKey: ['applications', 'search', filters],
    queryFn: () => applicationsApi.search({
      university: filters.university || undefined,
      country: filters.country || undefined,
      program: filters.program || undefined,
      status: filters.status || undefined,
      degree_level: filters.degree_level || undefined,
      year: filters.year ? Number(filters.year) : undefined,
      scholarship_received: filters.scholarship_received === 'true' ? true : undefined,
    }),
  });

  const clearFilters = () => {
    setFilters({
      university: '',
      country: '',
      program: '',
      status: '',
      degree_level: '',
      year: '',
      scholarship_received: '',
    });
  };

  const hasFilters = Object.values(filters).some(v => v !== '');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Search Applications</h1>
        <p className="text-gray-600">Find success stories and learn from others' experiences</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filters</span>
            {hasFilters && (
              <button 
                onClick={clearFilters}
                className="text-sm text-primary-600 hover:underline ml-auto"
              >
                Clear all
              </button>
            )}
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="University..."
                value={filters.university}
                onChange={(e) => setFilters(f => ({ ...f, university: e.target.value }))}
                className="pl-10"
              />
            </div>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Country..."
                value={filters.country}
                onChange={(e) => setFilters(f => ({ ...f, country: e.target.value }))}
                className="pl-10"
              />
            </div>
            <Input
              placeholder="Program..."
              value={filters.program}
              onChange={(e) => setFilters(f => ({ ...f, program: e.target.value }))}
            />
            <Select
              options={STATUS_OPTIONS}
              value={filters.status}
              onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
            />
          </div>
          
          <div className="grid sm:grid-cols-3 gap-4 mt-4">
            <Select
              options={DEGREE_OPTIONS}
              value={filters.degree_level}
              onChange={(e) => setFilters(f => ({ ...f, degree_level: e.target.value }))}
            />
            <Select
              options={YEAR_OPTIONS}
              value={filters.year}
              onChange={(e) => setFilters(f => ({ ...f, year: e.target.value }))}
            />
            <Select
              options={[
                { value: '', label: 'All scholarships' },
                { value: 'true', label: 'With scholarship' },
              ]}
              value={filters.scholarship_received}
              onChange={(e) => setFilters(f => ({ ...f, scholarship_received: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="w-8 h-8 text-primary-600" />
        </div>
      ) : !applications || applications.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<Search className="w-6 h-6" />}
              title="No applications found"
              description={hasFilters 
                ? "Try adjusting your filters" 
                : "No applications have been shared yet"}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">{applications.length} applications found</p>
          
          {applications.map((app) => (
            <Link key={app.id} to={`/applicants/${app.applicant_id}`}>
              <Card className="hover:border-primary-200 transition-colors">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-gray-900">{app.university_name}</h3>
                        <StatusBadge status={app.status} />
                      </div>
                      <p className="text-gray-600">{app.program_name}</p>
                      
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Globe className="w-4 h-4" />
                          {app.country}
                        </span>
                        <span>{app.degree_level.toUpperCase()}</span>
                        <span>{app.application_year}</span>
                        {app.scholarship_received && (
                          <span className="flex items-center gap-1 text-green-600">
                            <Award className="w-4 h-4" />
                            Scholarship
                          </span>
                        )}
                      </div>
                      
                      {app.notes && (
                        <p className="mt-3 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg line-clamp-2">
                          💡 {app.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
