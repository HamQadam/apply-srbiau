import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import fa from './locales/fa.json';

const resolveInitialLanguage = () => {
  const savedLanguage = localStorage.getItem('language');
  if (savedLanguage === 'fa' || savedLanguage === 'en') {
    return savedLanguage;
  }

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const browserLanguages = navigator.languages.length > 0 ? navigator.languages : [navigator.language];

  if (timeZone === 'Asia/Tehran' || browserLanguages.some((lang) => /^fa(-|$)/i.test(lang))) {
    return 'fa';
  }

  return browserLanguages.some((lang) => /^en(-|$)/i.test(lang)) ? 'en' : 'fa';
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fa: { translation: fa },
    },
    lng: resolveInitialLanguage(),
    fallbackLng: 'fa',
    supportedLngs: ['en', 'fa'],
    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'language',
    },
  });

export default i18n;
