import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Globe, GraduationCap, Award, TrendingUp } from 'lucide-react';
import { applicationsApi } from '../api';
import { Card, CardContent, CardHeader, Select, Spinner } from '../components/ui';

const YEAR_OPTIONS = [
  { value: '', label: 'All years' },
  ...Array.from({ length: 5 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return { value: String(year), label: String(year) };
  }),
];

export function StatsPage() {
  const [year, setYear] = useState('');

  const { data: universityStats, isLoading: loadingUni } = useQuery({
    queryKey: ['stats', 'university', year],
    queryFn: () => applicationsApi.statsByUniversity(year ? Number(year) : undefined),
  });

  const { data: countryStats, isLoading: loadingCountry } = useQuery({
    queryKey: ['stats', 'country', year],
    queryFn: () => applicationsApi.statsByCountry(year ? Number(year) : undefined),
  });

  const isLoading = loadingUni || loadingCountry;

  const totalApplications = countryStats?.reduce((sum, s) => sum + s.total_applications, 0) || 0;
  const totalAccepted = countryStats?.reduce((sum, s) => sum + s.accepted, 0) || 0;
  const totalScholarships = countryStats?.reduce((sum, s) => sum + s.with_scholarship, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Statistics</h1>
          <p className="text-gray-600">Application trends and acceptance rates</p>
        </div>
        <div className="w-40">
          <Select
            options={YEAR_OPTIONS}
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{totalApplications}</div>
                <div className="text-sm text-gray-500">Total Applications</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{totalAccepted}</div>
                <div className="text-sm text-gray-500">Acceptances</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Award className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{totalScholarships}</div>
                <div className="text-sm text-gray-500">Scholarships</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Globe className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{countryStats?.length || 0}</div>
                <div className="text-sm text-gray-500">Countries</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* By Country */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-gray-400" />
              <h2 className="font-semibold">By Country</h2>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Spinner className="w-6 h-6 text-primary-600" />
              </div>
            ) : !countryStats || countryStats.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No data available</p>
            ) : (
              <div className="space-y-4">
                {countryStats
                  .sort((a, b) => b.total_applications - a.total_applications)
                  .map((stat) => (
                    <div key={stat.country} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-900">{stat.country}</span>
                          <span className="text-sm text-gray-500">{stat.total_applications} apps</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-primary-500 h-2 rounded-full"
                            style={{ 
                              width: `${(stat.accepted / Math.max(stat.total_applications, 1)) * 100}%` 
                            }}
                          />
                        </div>
                        <div className="flex gap-4 mt-1 text-xs text-gray-500">
                          <span className="text-green-600">{stat.accepted} accepted</span>
                          <span>{stat.with_scholarship} scholarships</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* By University */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-gray-400" />
              <h2 className="font-semibold">By University</h2>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Spinner className="w-6 h-6 text-primary-600" />
              </div>
            ) : !universityStats || universityStats.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No data available</p>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {universityStats
                  .sort((a, b) => b.total_applications - a.total_applications)
                  .map((stat) => (
                    <div 
                      key={`${stat.university}-${stat.country}`} 
                      className="p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{stat.university}</h3>
                          <p className="text-sm text-gray-500">{stat.country}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-primary-600">
                            {stat.acceptance_rate}%
                          </div>
                          <div className="text-xs text-gray-500">acceptance rate</div>
                        </div>
                      </div>
                      <div className="flex gap-4 mt-2 text-sm">
                        <span className="text-gray-600">{stat.total_applications} apps</span>
                        <span className="text-green-600">{stat.accepted} accepted</span>
                        <span className="text-red-600">{stat.rejected} rejected</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
