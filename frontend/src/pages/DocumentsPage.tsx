import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FileText, Download, Search, Filter } from 'lucide-react';
import { documentsApi } from '../api';
import { Card, CardContent, Input, Select, Spinner, EmptyState, Badge } from '../components/ui';

const DOCUMENT_TYPES = [
  { value: '', label: 'All types' },
  { value: 'cv', label: 'CV / Resume' },
  { value: 'statement_of_purpose', label: 'Statement of Purpose' },
  { value: 'motivation_letter', label: 'Motivation Letter' },
  { value: 'recommendation_letter', label: 'Recommendation Letter' },
  { value: 'transcript', label: 'Transcript' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'other', label: 'Other' },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDocType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function DocumentsPage() {
  const [filters, setFilters] = useState({
    document_type: '',
    university: '',
  });

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents', 'search', filters],
    queryFn: () => documentsApi.search({
      document_type: filters.document_type || undefined,
      university: filters.university || undefined,
    }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Document Library</h1>
        <p className="text-gray-600">Browse CVs, SOPs, and motivation letters from other applicants</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filters</span>
          </div>
          
          <div className="grid sm:grid-cols-2 gap-4">
            <Select
              options={DOCUMENT_TYPES}
              value={filters.document_type}
              onChange={(e) => setFilters(f => ({ ...f, document_type: e.target.value }))}
            />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Filter by university..."
                value={filters.university}
                onChange={(e) => setFilters(f => ({ ...f, university: e.target.value }))}
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
      ) : !documents || documents.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<FileText className="w-6 h-6" />}
              title="No documents found"
              description={filters.document_type || filters.university 
                ? "Try adjusting your filters" 
                : "No public documents have been shared yet"}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">{documents.length} documents found</p>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => (
              <Card key={doc.id} className="hover:border-primary-200 transition-colors">
                <CardContent>
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gray-100 rounded-lg">
                      <FileText className="w-6 h-6 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{doc.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge>{formatDocType(doc.document_type)}</Badge>
                      </div>
                      
                      {(doc.used_for_university || doc.used_for_program) && (
                        <p className="text-sm text-gray-500 mt-2 truncate">
                          Used for: {doc.used_for_university || doc.used_for_program}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-gray-400">
                          {formatBytes(doc.file_size)}
                        </span>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/applicants/${doc.applicant_id}`}
                            className="text-xs text-primary-600 hover:underline"
                          >
                            View profile
                          </Link>
                          <a
                            href={`/api/v1/applicants/${doc.applicant_id}/documents/${doc.id}/download`}
                            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 rounded-lg"
                            download
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
