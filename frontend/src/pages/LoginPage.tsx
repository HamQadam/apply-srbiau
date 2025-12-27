import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Phone, KeyRound, ArrowRight} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/auth';
import { Card, CardContent, CardHeader, Button, Input } from '../components/ui';

type Step = 'phone' | 'otp';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Where to redirect after login
  const from = (location.state as { from?: string })?.from || '/';

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authApi.sendOTP(phone);
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ارسال کد');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.verifyOTP(phone, otp);
      
      // Get full user info including applicant_id
      const meResponse = await fetch('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${response.access_token}` },
      }).then(r => r.json());
      
      login(response.access_token, meResponse.user, meResponse.applicant_id);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'کد نامعتبر است');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {step === 'phone' ? 'ورود به اپلای' : 'تایید شماره'}
          </h1>
          <p className="text-gray-600 mt-2">
            {step === 'phone'
              ? 'شماره موبایل خود را وارد کنید'
              : `کد تایید به ${phone} ارسال شد`}
          </p>
        </CardHeader>

        <CardContent>
          {step === 'phone' ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="tel"
                  placeholder="09123456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10 text-lg"
                  dir="ltr"
                  required
                />
              </div>

              {error && (
                <p className="text-red-600 text-sm text-center">{error}</p>
              )}

              <Button type="submit" className="w-full" loading={loading}>
                ارسال کد تایید
                <ArrowRight className="w-4 h-4 mr-2" />
              </Button>

              <p className="text-xs text-gray-500 text-center">
                در حالت آزمایشی، کد تایید <strong>000000</strong> است
              </p>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="کد ۶ رقمی"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="pl-10 text-lg text-center tracking-widest"
                  maxLength={6}
                  dir="ltr"
                  required
                />
              </div>

              {error && (
                <p className="text-red-600 text-sm text-center">{error}</p>
              )}

              <Button type="submit" className="w-full" loading={loading}>
                تایید و ورود
              </Button>

              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setOtp('');
                  setError('');
                }}
                className="w-full text-sm text-gray-500 hover:text-gray-700"
              >
                تغییر شماره موبایل
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
