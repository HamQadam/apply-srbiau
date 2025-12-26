import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Globe, 
  Award, 
  TrendingUp,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { applicationsApi, applicantsApi } from '../api';
import { Card, CardContent, Spinner } from '../components/ui';

export function HomePage() {
  const { data: applicants } = useQuery({
    queryKey: ['applicants'],
    queryFn: () => applicantsApi.list(),
  });

  const { data: countryStats } = useQuery({
    queryKey: ['stats', 'country'],
    queryFn: () => applicationsApi.statsByCountry(),
  });

  const { data: universityStats } = useQuery({
    queryKey: ['stats', 'university'],
    queryFn: () => applicationsApi.statsByUniversity(),
  });

  const totalApplicants = applicants?.length || 0;
  const totalAccepted = countryStats?.reduce((sum, s) => sum + s.accepted, 0) || 0;
  const totalScholarships = countryStats?.reduce((sum, s) => sum + s.with_scholarship, 0) || 0;
  const countries = new Set(countryStats?.map(s => s.country)).size;

  return (
    <div className="space-y-12">
      {/* Hero */}
      <div className="text-center py-12 px-4">
        <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
          <Sparkles className="w-4 h-4" />
          Learn from real application journeys
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
          Student Application Database
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          A community-driven platform where students share their foreign university 
          application experiences to help future applicants succeed.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/applicants/new"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            Share Your Journey
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/search"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-900 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Browse Applications
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="text-center py-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{totalApplicants}</div>
            <div className="text-sm text-gray-500">Applicants</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{totalAccepted}</div>
            <div className="text-sm text-gray-500">Acceptances</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-full mb-3">
              <Award className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{totalScholarships}</div>
            <div className="text-sm text-gray-500">Scholarships</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-3">
              <Globe className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{countries}</div>
            <div className="text-sm text-gray-500">Countries</div>
          </CardContent>
        </Card>
      </div>

      {/* Top Universities */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Top Universities</h2>
          <Link to="/stats" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
            View all stats →
          </Link>
        </div>
        
        {!universityStats ? (
          <div className="flex justify-center py-12">
            <Spinner className="w-8 h-8 text-primary-600" />
          </div>
        ) : universityStats.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12 text-gray-500">
              No application data yet. Be the first to share!
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {universityStats.slice(0, 6).map((stat) => (
              <Card key={`${stat.university}-${stat.country}`}>
                <CardContent>
                  <h3 className="font-semibold text-gray-900 mb-1">{stat.university}</h3>
                  <p className="text-sm text-gray-500 mb-3">{stat.country}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-600">
                      <span className="font-medium">{stat.total_applications}</span> apps
                    </span>
                    <span className="text-green-600">
                      <span className="font-medium">{stat.accepted}</span> accepted
                    </span>
                    <span className="text-gray-400">
                      {stat.acceptance_rate}% rate
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent Applicants */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Recent Contributors</h2>
          <Link to="/applicants" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
            View all →
          </Link>
        </div>
        
        {!applicants ? (
          <div className="flex justify-center py-12">
            <Spinner className="w-8 h-8 text-primary-600" />
          </div>
        ) : applicants.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12 text-gray-500">
              No applicants yet. Be the first to share your journey!
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {applicants.slice(0, 6).map((applicant) => (
              <Link key={applicant.id} to={`/applicants/${applicant.id}`}>
                <Card className="h-full hover:border-primary-200">
                  <CardContent>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {applicant.display_name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {applicant.major} • {applicant.university}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{applicant.degree_level}</span>
                      <span>•</span>
                      <span>Class of {applicant.graduation_year}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
