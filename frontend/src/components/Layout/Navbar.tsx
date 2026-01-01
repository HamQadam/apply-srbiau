import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../lib/cn';

export function Navbar() {
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { t } = useTranslation();
  const { toggleTheme, resolvedTheme } = useTheme();
  const { language, toggleLanguage, direction } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const MotionLink = motion(Link);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const navLinks = useMemo(
    () =>
      isAuthenticated
        ? [
            { to: '/dashboard', label: t('nav.dashboard') },
            { to: '/explore', label: t('nav.explore') },
            { to: '/recommendations', label: t('nav.recommendations') },
          ]
        : [{ to: '/explore', label: t('nav.browse') }],
    [isAuthenticated, t]
  );

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  return (
    <nav className="bg-surface/90 border-b border-border sticky top-0 z-50 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-2xl">🎓</span>
              <span className="font-display font-bold text-xl text-text-primary">Ghadam</span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <MotionLink
                key={link.to}
                to={link.to}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'px-3 py-2 text-sm font-medium transition-colors',
                  isActive(link.to)
                    ? 'text-brand-primary'
                    : 'text-text-secondary hover:text-text-primary'
                )}
              >
                {link.label}
              </MotionLink>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
                onClick={toggleLanguage}
                className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-text-secondary hover:text-text-primary hover:border-text-muted transition-colors"
                aria-label={t('nav.toggleLanguage')}
              >
                {language === 'en' ? t('nav.langFa') : t('nav.langEn')}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
                onClick={toggleTheme}
                className="p-2 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:border-text-muted transition-colors"
                aria-label={t('nav.toggleTheme')}
              >
                {resolvedTheme === 'dark' ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364 6.364-1.414-1.414M7.05 7.05 5.636 5.636m12.728 0-1.414 1.414M7.05 16.95l-1.414 1.414M12 6.5a5.5 5.5 0 1 0 0 11a5.5 5.5 0 0 0 0-11z"
                    />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"
                    />
                  </svg>
                )}
              </motion.button>
            </div>
            {isAuthenticated ? (
              <>
                {/* Ghadam Balance */}
                <MotionLink
                  to="/wallet"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="hidden md:flex items-center gap-1 px-3 py-1.5 bg-brand-accent/10 text-brand-accent rounded-full text-sm font-medium hover:bg-brand-accent/20 transition-colors"
                >
                  <span>🪙</span>
                  <span>{user?.ghadam_balance ?? 0}</span>
                </MotionLink>

                {/* User Menu */}
                <div className="relative group hidden md:block">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary"
                  >
                    <span className="w-8 h-8 bg-elevated rounded-full flex items-center justify-center">
                      {user?.display_name?.[0]?.toUpperCase() || '👤'}
                    </span>
                  </motion.button>
                  <div className="absolute end-0 mt-1 w-56 bg-surface border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-sm font-medium text-text-primary">
                        {user?.display_name || t('nav.userFallback')}
                      </p>
                      <p className="text-xs text-text-muted">{user?.phone}</p>
                    </div>
                    <div className="py-1">
                      <MotionLink
                        to="/settings"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.97 }}
                        className="block px-4 py-2 text-sm text-text-secondary hover:bg-elevated"
                      >
                        {t('nav.settings')}
                      </MotionLink>
                      <motion.button
                        onClick={logout}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.97 }}
                        className="block w-full text-start px-4 py-2 text-sm text-status-danger hover:bg-elevated"
                      >
                        {t('nav.signOut')}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <MotionLink
                to="/login"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="hidden md:inline-flex px-4 py-2 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-brand-secondary transition-colors"
              >
                {t('nav.signIn')}
              </MotionLink>
            )}

            <motion.button
              onClick={() => setIsMenuOpen(true)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="md:hidden p-2 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:border-text-muted transition-colors"
              aria-label={t('nav.openMenu')}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </motion.button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.button
              className="absolute inset-0 bg-inverse-background/50"
              onClick={() => setIsMenuOpen(false)}
              aria-label={t('nav.closeMenu')}
            />
            <motion.div
              initial={{ x: direction === 'rtl' ? '-100%' : '100%' }}
              animate={{ x: 0 }}
              exit={{ x: direction === 'rtl' ? '-100%' : '100%' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={cn(
                'relative ms-auto h-full w-full max-w-xs bg-surface border-l border-border shadow-xl p-6 flex flex-col gap-6',
                direction === 'rtl' && 'me-auto ms-0 border-r border-l-0'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-lg font-semibold text-text-primary">Ghadam</span>
                <motion.button
                  onClick={() => setIsMenuOpen(false)}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="p-2 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:border-text-muted transition-colors"
                  aria-label={t('nav.closeMenu')}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 6l12 12M6 18L18 6" />
                  </svg>
                </motion.button>
              </div>

              <div className="flex flex-col gap-3">
                {navLinks.map((link) => (
                  <MotionLink
                    key={link.to}
                    to={link.to}
                    onClick={() => setIsMenuOpen(false)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className={cn(
                      'rounded-xl px-4 py-3 text-sm font-medium transition-colors border border-transparent',
                      isActive(link.to)
                        ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/30'
                        : 'text-text-secondary hover:text-text-primary hover:bg-elevated'
                    )}
                  >
                    {link.label}
                  </MotionLink>
                ))}
                {isAuthenticated && (
                  <MotionLink
                    to="/settings"
                    onClick={() => setIsMenuOpen(false)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="rounded-xl px-4 py-3 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-elevated transition-colors"
                  >
                    {t('nav.settings')}
                  </MotionLink>
                )}
              </div>

              <div className="mt-auto space-y-3">
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={toggleLanguage}
                    className="flex-1 px-3 py-2 rounded-xl border border-border text-xs font-semibold text-text-secondary hover:text-text-primary hover:border-text-muted transition-colors"
                  >
                    {language === 'en' ? t('nav.langFa') : t('nav.langEn')}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={toggleTheme}
                    className="flex-1 px-3 py-2 rounded-xl border border-border text-xs font-semibold text-text-secondary hover:text-text-primary hover:border-text-muted transition-colors"
                  >
                    {resolvedTheme === 'dark' ? t('nav.lightMode') : t('nav.darkMode')}
                  </motion.button>
                </div>
                {isAuthenticated ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      logout();
                      setIsMenuOpen(false);
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-status-danger/10 text-status-danger text-sm font-medium"
                  >
                    {t('nav.signOut')}
                  </motion.button>
                ) : (
                  <MotionLink
                    to="/login"
                    onClick={() => setIsMenuOpen(false)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full inline-flex items-center justify-center px-4 py-3 rounded-xl bg-brand-primary text-white text-sm font-medium"
                  >
                    {t('nav.signIn')}
                  </MotionLink>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
