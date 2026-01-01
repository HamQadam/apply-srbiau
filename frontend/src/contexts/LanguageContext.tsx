import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import i18n from '../i18n';

export type Language = 'en' | 'fa';
export type Direction = 'ltr' | 'rtl';

interface LanguageContextValue {
  language: Language;
  direction: Direction;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const resolveLanguage = (lang: string | undefined): Language =>
  lang?.toLowerCase().startsWith('fa') ? 'fa' : 'en';

const applyDocumentLanguage = (language: Language) => {
  const direction: Direction = language === 'fa' ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('lang', language);
  document.documentElement.setAttribute('dir', direction);
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => resolveLanguage(i18n.language));

  useEffect(() => {
    applyDocumentLanguage(language);
    i18n.changeLanguage(language).catch(() => undefined);
    localStorage.setItem('language', language);
  }, [language]);

  const setLanguage = (next: Language) => {
    setLanguageState(next);
  };

  const toggleLanguage = () => {
    setLanguageState((current) => (current === 'en' ? 'fa' : 'en'));
  };

  const direction: Direction = language === 'fa' ? 'rtl' : 'ltr';

  const value = useMemo(
    () => ({
      language,
      direction,
      setLanguage,
      toggleLanguage,
    }),
    [language, direction]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
