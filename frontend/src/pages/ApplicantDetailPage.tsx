import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  GraduationCap, 
  Calendar, 
  Languages, 
  FileText, 
  Briefcase,
  Globe,
  Download,
  Award,
  ExternalLink,
  ArrowLeft,
  Eye,
  Coins,
} from 'lucide-react';
import { applicantsApi, documentsApi } from '../api';
import { subscriptionApi } from '../api/auth';
import { useAuth } from '../contexts/AuthContext';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  Badge, 
  Spinner, 
  StatusBadge,
} from '../components/ui';
import { Paywall } from '../components/Paywall';
import type { ApplicantFull } from '../types';

export function ApplicantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  
  // First check access
  const { data: accessCheck, isLoading: checkingAccess } = useQuery({
    queryKey: ['access-check', id],
    queryFn: () => subscriptionApi.checkAccess(Number(id)),
    enabled: !!id,
  });

  // Get preview (always available)
  const { data: preview, isLoading: loadingPreview } = useQuery({
    queryKey: ['applicant-preview', id],
    queryFn: () => subscriptionApi.getPreview(Number(id)),
    enabled: !!id,
  });

  // Get full data only if has access
  const { data: applicant, isLoading: loadingFull, refetch: refetchFull } = useQuery({
    queryKey: ['applicant', id, 'full'],
    queryFn: () => applicantsApi.getFull(Number(id)),
    enabled: !!id && hasAccess === true,
  });

  useEffect(() => {
    if (accessCheck) {
      setHasAccess(accessCheck.has_access);
    }
  }, [accessCheck]);

  const handleAccessGranted = () => {
    setHasAccess(true);
    refetchFull();
  };

  if (checkingAccess || loadingPreview) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="w-8 h-8 text-primary-600" />
      </div>
    );
  }

  if (!preview) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <p className="text-red-600">متقاضی یافت نشد</p>
          <Link to="/applicants" className="text-primary-600 hover:underline mt-2 inline-block">
            ← بازگشت به لیست متقاضیان
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Link 
        to="/applicants" 
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        بازگشت به لیست متقاضیان
      </Link>

      {/* Profile Header - Always visible */}
      <Card>
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-3xl font-bold text-primary-700">
                {preview.display_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">
                    {preview.display_name}
                  </h1>
                  <p className="text-lg text-gray-600">{preview.major}</p>
                </div>
                <div className="flex items-center gap-2">
                  {preview.is_premium && (
                    <Badge variant="warning">پریمیوم</Badge>
                  )}
                  <div className="flex items-center gap-1 text-gray-500 text-sm">
                    <Eye className="w-4 h-4" />
                    <span>{preview.total_views} بازدید</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  <span>{preview.university}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{preview.degree_level} • فارغ‌التحصیل {preview.graduation_year}</span>
                </div>
              </div>

              {/* Preview stats */}
              <div className="mt-4 flex gap-4">
                <div className="bg-gray-50 px-4 py-2 rounded-lg">
                  <div className="text-xs text-gray-500">اپلیکیشن‌ها</div>
                  <div className="font-semibold">{preview.application_count}</div>
                </div>
                {preview.has_documents && (
                  <div className="bg-gray-50 px-4 py-2 rounded-lg">
                    <div className="text-xs text-gray-500">اسناد</div>
                    <div className="font-semibold">✓</div>
                  </div>
                )}
                <div className="bg-yellow-50 px-4 py-2 rounded-lg">
                  <div className="text-xs text-gray-500">قیمت دسترسی</div>
                  <div className="font-semibold flex items-center gap-1">
                    <Coins className="w-4 h-4 text-yellow-600" />
                    {preview.view_price} قدم
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Paywall or Full Content */}
      {hasAccess === false ? (
        <Paywall
          applicantId={Number(id)}
          displayName={preview.display_name}
          viewPrice={preview.view_price}
          applicationCount={preview.application_count}
          hasDocuments={preview.has_documents}
          onAccessGranted={handleAccessGranted}
        />
      ) : loadingFull || !applicant ? (
        <div className="flex justify-center py-12">
          <Spinner className="w-8 h-8 text-primary-600" />
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Applications */}
          <ApplicationsSection applications={applicant.applications} />
          
          {/* Language Credentials */}
          <LanguagesSection credentials={applicant.language_credentials} />
          
          {/* Documents */}
          <DocumentsSection documents={applicant.documents} applicantId={applicant.id} />
          
          {/* Activities */}
          <ActivitiesSection activities={applicant.activities} />
        </div>
      )}
    </div>
  );
}

function ApplicationsSection({ applications }: { applications: ApplicantFull['applications'] }) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-gray-400" />
          <h2 className="font-semibold text-gray-900">Applications ({applications.length})</h2>
        </div>
      </CardHeader>
      <CardContent>
        {applications.length === 0 ? (
          <p className="text-gray-500 text-sm">No applications shared yet.</p>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <div 
                key={app.id} 
                className="border border-gray-100 rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium text-gray-900">{app.university_name}</h3>
                    <p className="text-sm text-gray-600">{app.program_name}</p>
                  </div>
                  <StatusBadge status={app.status} />
                </div>
                
                <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-2">
                  <span>{app.country}</span>
                  <span>•</span>
                  <span>{app.degree_level.toUpperCase()}</span>
                  <span>•</span>
                  <span>{app.application_year}</span>
                  {app.scholarship_received && (
                    <>
                      <span>•</span>
                      <span className="text-green-600 flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        Scholarship
                      </span>
                    </>
                  )}
                </div>
                
                {app.notes && (
                  <p className="text-sm text-gray-600 mt-2 bg-blue-50 p-3 rounded-lg">
                    💡 {app.notes}
                  </p>
                )}
                
                {app.interview_experience && (
                  <p className="text-sm text-gray-600 mt-2 bg-yellow-50 p-3 rounded-lg">
                    🎤 Interview: {app.interview_experience}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LanguagesSection({ credentials }: { credentials: ApplicantFull['language_credentials'] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Languages className="w-5 h-5 text-gray-400" />
          <h2 className="font-semibold text-gray-900">Language Credentials ({credentials.length})</h2>
        </div>
      </CardHeader>
      <CardContent>
        {credentials.length === 0 ? (
          <p className="text-gray-500 text-sm">No language credentials shared.</p>
        ) : (
          <div className="space-y-4">
            {credentials.map((cred) => (
              <div key={cred.id} className="border-l-4 border-primary-200 pl-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-900">{cred.test_type}</span>
                    <span className="text-gray-500 text-sm ml-2">({cred.language})</span>
                  </div>
                  <span className="text-lg font-bold text-primary-600">{cred.overall_score}</span>
                </div>
                
                {(cred.reading_score || cred.writing_score || cred.speaking_score || cred.listening_score) && (
                  <div className="flex gap-3 mt-2 text-xs text-gray-500">
                    {cred.reading_score && <span>R: {cred.reading_score}</span>}
                    {cred.listening_score && <span>L: {cred.listening_score}</span>}
                    {cred.speaking_score && <span>S: {cred.speaking_score}</span>}
                    {cred.writing_score && <span>W: {cred.writing_score}</span>}
                  </div>
                )}
                
                {cred.notes && (
                  <p className="text-sm text-gray-600 mt-2">{cred.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DocumentsSection({ documents, applicantId }: { documents: ApplicantFull['documents']; applicantId: number }) {
  const publicDocs = documents.filter(d => d.is_public);
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-400" />
          <h2 className="font-semibold text-gray-900">Documents ({publicDocs.length})</h2>
        </div>
      </CardHeader>
      <CardContent>
        {publicDocs.length === 0 ? (
          <p className="text-gray-500 text-sm">No public documents shared.</p>
        ) : (
          <div className="space-y-3">
            {publicDocs.map((doc) => (
              <div 
                key={doc.id} 
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{doc.title}</p>
                    <p className="text-xs text-gray-500">
                      {doc.document_type.replace('_', ' ')} • {formatBytes(doc.file_size)}
                    </p>
                  </div>
                </div>
                <a
                  href={documentsApi.getDownloadUrl(applicantId, doc.id)}
                  className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 rounded-lg"
                  download
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActivitiesSection({ activities }: { activities: ApplicantFull['activities'] }) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-gray-400" />
          <h2 className="font-semibold text-gray-900">Activities & Experience ({activities.length})</h2>
        </div>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-gray-500 text-sm">No activities shared yet.</p>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="border-l-4 border-gray-200 pl-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{activity.title}</h3>
                    <p className="text-sm text-gray-600">{activity.organization}</p>
                  </div>
                  <Badge>{activity.activity_type.replace('_', ' ')}</Badge>
                </div>
                
                <p className="text-sm text-gray-600 mt-2">{activity.description}</p>
                
                {activity.url && (
                  <a 
                    href={activity.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline mt-2"
                  >
                    View <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                
                {activity.impact_note && (
                  <p className="text-sm text-green-700 mt-2 bg-green-50 p-2 rounded">
                    Impact: {activity.impact_note}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
