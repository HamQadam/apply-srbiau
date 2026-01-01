import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PageTransition } from '../../components/Transitions/PageTransition';

export function HomePage() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();

  return (
    <PageTransition>
      <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-brand-primary via-brand-secondary to-brand-primary text-white">
        <div className="max-w-7xl mx-auto px-4 py-20 md:py-32">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight font-display">
              {t('home.heroTitleLine1')}
              <br />
              {t('home.heroTitleLine2')}
            </h1>
            <p className="mt-6 text-xl text-white/80">
              {t('home.heroSubtitle')}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              {isAuthenticated ? (
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link
                  to="/dashboard"
                  className="inline-block px-6 py-3 bg-white text-brand-primary font-semibold rounded-lg hover:bg-white/90 transition-colors text-center"
                >
                  {t('home.cta.dashboard')}
                </Link>
                </motion.div>
              ) : (
                <>
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Link
                    to="/login"
                    className="inline-block px-6 py-3 bg-white text-brand-primary font-semibold rounded-lg hover:bg-white/90 transition-colors text-center"
                  >
                    {t('home.cta.start')}
                  </Link>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Link
                    to="/explore"
                    className="inline-block px-6 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-colors text-center"
                  >
                    {t('home.cta.browse')}
                  </Link>
                  </motion.div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
        <h2 className="text-3xl font-bold text-text-primary text-center mb-12">
          {t('home.features.title')}
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-text-primary mb-2">{t('home.features.track.title')}</h3>
            <p className="text-text-muted">
              {t('home.features.track.description')}
            </p>
          </div>
          
          <div className="text-center p-6">
            <div className="text-5xl mb-4">👥</div>
            <h3 className="text-xl font-semibold text-text-primary mb-2">{t('home.features.learn.title')}</h3>
            <p className="text-text-muted">
              {t('home.features.learn.description')}
            </p>
          </div>
          
          <div className="text-center p-6">
            <div className="text-5xl mb-4">🪙</div>
            <h3 className="text-xl font-semibold text-text-primary mb-2">{t('home.features.earn.title')}</h3>
            <p className="text-text-muted">
              {t('home.features.earn.description')}
            </p>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-elevated/60 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-text-primary text-center mb-12">
            {t('home.how.title')}
          </h2>
          
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-brand-primary text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-text-primary text-lg">{t('home.how.step1.title')}</h3>
                <p className="text-text-muted mt-1">
                  {t('home.how.step1.description')}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-brand-primary text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-text-primary text-lg">{t('home.how.step2.title')}</h3>
                <p className="text-text-muted mt-1">
                  {t('home.how.step2.description')}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-brand-primary text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold text-text-primary text-lg">{t('home.how.step3.title')}</h3>
                <p className="text-text-muted mt-1">
                  {t('home.how.step3.description')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 text-center">
        <h2 className="text-3xl font-bold text-text-primary mb-4">
          {t('home.cta.title')}
        </h2>
        <p className="text-xl text-text-muted mb-8">
          {t('home.cta.subtitle')}
        </p>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Link
          to={isAuthenticated ? '/dashboard' : '/login'}
          className="inline-block px-8 py-4 bg-brand-primary text-white font-semibold rounded-lg hover:bg-brand-secondary transition-colors"
        >
          {isAuthenticated ? t('home.cta.dashboard') : t('home.cta.start')}
        </Link>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="bg-inverse-background text-inverse-muted py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <span className="text-2xl">🎓</span>
              <span className="font-bold text-inverse-text">Ghadam</span>
            </div>
            <div className="text-sm">
              {t('home.footer', { year: new Date().getFullYear() })}
            </div>
          </div>
        </div>
      </footer>
      </div>
    </PageTransition>
  );
}
