import { motion } from 'framer-motion';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authApi } from '../../api/services';
import { PageTransition } from '../../components/Transitions/PageTransition';
import { Spinner } from '../../components/Feedback/Spinner';
import { loadGoogleIdentity, getGoogleClientId } from '../../auth/googleIdentity';
import { useEffect } from 'react';

const { login, loginWithGoogle } = useAuth();
const [googleReady, setGoogleReady] = useState(false);
const [googleLoading, setGoogleLoading] = useState(false);

useEffect(() => {
  loadGoogleIdentity()
    .then(() => setGoogleReady(true))
    .catch(() => setGoogleReady(false));
}, []);

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { t } = useTranslation();
  
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const from = (location.state as { from?: string })?.from || '/dashboard';
  
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const response = await authApi.requestOTP(phone);
      if (response.debug_code) {
        setDebugCode(response.debug_code);
      }
      setStep('otp');
      toast.success(t('auth.otpSent'));
    } catch (err) {
      const message = err instanceof Error ? err.message : t('auth.sendOtpError');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const response = await login(phone, otp);
      
      // If new user or hasn't completed onboarding, go to onboarding
      if (response.is_new_user || !response.user.onboarding_completed) {
        navigate('/onboarding');
      } else {
        navigate(from);
      }
      toast.success(t('auth.signedIn'));
    } catch (err) {
      const message = err instanceof Error ? err.message : t('auth.invalidOtp');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <PageTransition>
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4">
        <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <span className="text-5xl">🎓</span>
          <h1 className="mt-4 text-3xl font-bold text-text-primary">{t('auth.welcomeTitle')}</h1>
          <p className="mt-2 text-text-muted">
            {t('auth.welcomeSubtitle')}
          </p>
        </div>
        
        <div className="bg-surface rounded-xl shadow-sm border border-border p-8">
          {step === 'phone' ? (
            <form onSubmit={handleRequestOTP}>
              <div className="mb-6">
                <label htmlFor="phone" className="block text-sm font-medium text-text-secondary mb-2">
                  {t('auth.phoneLabel')}
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t('auth.phonePlaceholder')}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent bg-background"
                  required
                />
              </div>
              
              {error && (
                <div className="mb-4 p-3 bg-status-danger/10 text-status-danger text-sm rounded-lg">
                  {error}
                </div>
              )}
              
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="w-full py-3 bg-brand-primary text-white font-medium rounded-lg hover:bg-brand-secondary disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner className="h-4 w-4 border-white border-t-transparent" />
                    {t('auth.sending')}
                  </span>
                ) : (
                  t('auth.sendCode')
                )}
              </motion.button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP}>
              <div className="mb-2 text-sm text-text-muted">
                {t('auth.sentTo', { phone })}
              </div>
              
              {debugCode && (
                <div className="mb-4 p-3 bg-status-warning/10 text-status-warning text-sm rounded-lg">
                  {t('auth.debugCode', { code: debugCode })}
                </div>
              )}
              
              <div className="mb-6">
                <label htmlFor="otp" className="block text-sm font-medium text-text-secondary mb-2">
                  {t('auth.codeLabel')}
                </label>
                <input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder={t('auth.codePlaceholder')}
                  maxLength={6}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-center text-2xl tracking-widest font-mono bg-background"
                  required
                />
              </div>
              
              {error && (
                <div className="mb-4 p-3 bg-status-danger/10 text-status-danger text-sm rounded-lg">
                  {error}
                </div>
              )}
              
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="w-full py-3 bg-brand-primary text-white font-medium rounded-lg hover:bg-brand-secondary disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner className="h-4 w-4 border-white border-t-transparent" />
                    {t('auth.verifying')}
                  </span>
                ) : (
                  t('auth.verify')
                )}
              </motion.button>
              
              <motion.button
                type="button"
                onClick={handleGoogleLogin}
                disabled={!googleReady || googleLoading || loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="w-full py-3 bg-white text-gray-800 font-medium rounded-lg border border-border hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {googleLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner className="h-4 w-4 border-gray-800 border-t-transparent" />
                    Continue with Google
                  </span>
                ) : (
                  <>
                    <span className="text-lg">G</span>
                    Continue with Google
                  </>
                )}
              </motion.button>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px bg-border flex-1" />
                <div className="text-xs text-text-muted">OR</div>
                <div className="h-px bg-border flex-1" />
              </div>

            </form>
          )}
        </div>
        
        <p className="mt-6 text-center text-sm text-text-muted">
          {t('auth.terms')}
        </p>
      </div>
      </div>
    </PageTransition>
  );
}

const handleGoogleLogin = async () => {
  setError(null);

  try {
    setGoogleLoading(true);
    await loadGoogleIdentity();

    const client = window.google.accounts.oauth2.initCodeClient({
      client_id: getGoogleClientId(),
      scope: 'openid email profile',
      ux_mode: 'popup',
      select_account: true,
      callback: async (response: { code?: string; error?: string }) => {
        if (!response.code) {
          const msg = response.error ? `Google error: ${response.error}` : 'Google sign-in failed';
          setError(msg);
          toast.error(msg);
          setGoogleLoading(false);
          return;
        }

        try {
          const authResp = await loginWithGoogle(response.code);

          if (authResp.is_new_user || !authResp.user.onboarding_completed) {
            navigate('/onboarding');
          } else {
            navigate(from);
          }

          toast.success(t('auth.signedIn'));
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Google login failed';
          setError(message);
          toast.error(message);
        } finally {
          setGoogleLoading(false);
        }
      },
    });

    client.requestCode();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Google login failed';
    setError(message);
    toast.error(message);
    setGoogleLoading(false);
  }
};
