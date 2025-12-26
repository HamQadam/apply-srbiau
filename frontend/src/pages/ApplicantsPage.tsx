import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, Users, GraduationCap, Calendar } from 'lucide-react';
import { applicantsApi } from '../api';
import { Card, CardContent, Input, Spinner, EmptyState, LinkButton } from '../components/ui';

export function ApplicantsPage() {
  const [filters, setFilters] = useState({
    university: '',
    major: '',
  });

  const { data: applicants, isLoading } = useQuery({
    queryKey: ['applicants', filters],
    queryFn: () => applicantsApi.list({
      university: filters.university || undefined,
      major: filters.major || undefined,
    }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Applicants</h1>
          <p className="text-gray-600">Browse student profiles and their application journeys</p>
        </div>
        <LinkButton to="/applicants/new">Share Your Journey</LinkButton>
      </div>

      {/* Filters */}
      <Card>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Filter by university..."
                value={filters.university}
                onChange={(e) => setFilters(f => ({ ...f, university: e.target.value }))}
                className="pl-10"
              />
            </div>
            <div className="relative">
              <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Filter by major..."
                value={filters.major}
                onChange={(e) => setFilters(f => ({ ...f, major: e.target.value }))}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="w-8 h-8 text-primary-600" />
        </div>
      ) : !applicants || applicants.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<Users className="w-6 h-6" />}
              title="No applicants found"
              description={filters.university || filters.major 
                ? "Try adjusting your filters"
                : "Be the first to share your application journey!"}
              action={
                <LinkButton to="/applicants/new" variant="primary">
                  Share Your Journey
                </LinkButton>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {applicants.map((applicant) => (
            <Link key={applicant.id} to={`/applicants/${applicant.id}`}>
              <Card className="h-full hover:border-primary-200 transition-colors">
                <CardContent>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-primary-700 font-semibold">
                        {applicant.display_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    {applicant.overall_gpa && (
                      <span className="text-sm font-medium text-gray-600">
                        GPA: {applicant.overall_gpa}
                      </span>
                    )}
                  </div>
                  
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {applicant.display_name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {applicant.major}
                  </p>
                  
                  <div className="space-y-1 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4" />
                      <span>{applicant.university}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{applicant.degree_level} • Class of {applicant.graduation_year}</span>
                    </div>
                  </div>
                  
                  {applicant.bio && (
                    <p className="mt-3 text-sm text-gray-500 line-clamp-2">
                      {applicant.bio}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
