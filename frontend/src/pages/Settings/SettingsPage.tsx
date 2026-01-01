import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { authApi } from '../../api/services';
import { PageTransition } from '../../components/Transitions/PageTransition';
import { Spinner } from '../../components/Feedback/Spinner';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme, type ThemeMode } from '../../contexts/ThemeContext';
import { cn } from '../../lib/cn';

export function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();

  const [displayName, setDisplayName] = useState(user?.display_name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDisplayName(user?.display_name ?? '');
    setEmail(user?.email ?? '');
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await authApi.updateMe({
        display_name: displayName || null,
        email: email || null,
      });
      await refreshUser();
      toast.success(t('settings.profileSaved'));
    } catch (err) {
      console.error('Failed to update profile:', err);
      toast.error(t('settings.profileSaveError'));
    } finally {
      setSaving(false);
    }
  };

  const themeOptions: Array<{ value: ThemeMode; label: string }> = [
    { value: 'light', label: t('settings.appearance.light') },
    { value: 'dark', label: t('settings.appearance.dark') },
    { value: 'system', label: t('settings.appearance.system') },
  ];

  const languageOptions = [
    { value: 'en', label: t('settings.language.english') },
    { value: 'fa', label: t('settings.language.persian') },
  ] as const;

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t('settings.title')}</h1>
          <p className="text-text-muted mt-1">{t('settings.subtitle')}</p>
        </div>

        <section className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">{t('settings.profile.title')}</h2>
            <p className="text-sm text-text-muted mt-1">{t('settings.profile.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                {t('settings.profile.displayName')}
              </label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t('settings.profile.displayNamePlaceholder')}
                className="w-full px-4 py-2.5 border border-border rounded-xl bg-background focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                {t('settings.profile.email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('settings.profile.emailPlaceholder')}
                className="w-full px-4 py-2.5 border border-border rounded-xl bg-background focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                {t('settings.profile.phone')}
              </label>
              <input
                value={user?.phone ?? ''}
                readOnly
                className="w-full px-4 py-2.5 border border-border rounded-xl bg-elevated text-text-muted"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleSaveProfile}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-brand-primary text-white font-medium hover:bg-brand-secondary disabled:opacity-50"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <Spinner className="h-4 w-4 border-white border-t-transparent" />
                  {t('common.saving')}
                </span>
              ) : (
                t('settings.profile.save')
              )}
            </motion.button>
          </div>
        </section>

        <section className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">{t('settings.appearance.title')}</h2>
            <p className="text-sm text-text-muted mt-1">{t('settings.appearance.subtitle')}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            {themeOptions.map((option) => (
              <motion.button
                key={option.value}
                onClick={() => setTheme(option.value)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  'px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors',
                  theme === option.value
                    ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                    : 'border-border text-text-secondary hover:bg-elevated'
                )}
              >
                {option.label}
              </motion.button>
            ))}
          </div>
        </section>

        <section className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">{t('settings.language.title')}</h2>
            <p className="text-sm text-text-muted mt-1">{t('settings.language.subtitle')}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            {languageOptions.map((option) => (
              <motion.button
                key={option.value}
                onClick={() => setLanguage(option.value)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  'px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors',
                  language === option.value
                    ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                    : 'border-border text-text-secondary hover:bg-elevated'
                )}
              >
                {option.label}
              </motion.button>
            ))}
          </div>
        </section>
      </div>
    </PageTransition>
  );
}
