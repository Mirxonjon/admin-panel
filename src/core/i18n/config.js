import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import translationEN from '../../../public/locales/en/translation.json';
import translationRU from '../../../public/locales/ru/translation.json';
import translationUZ from '../../../public/locales/uz/translation.json';

const resources = {
  en: {
    translation: translationEN.translation,
  },
  ru: {
    translation: translationRU.translation,
  },
  uz: {
    translation: translationUZ.translation,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ru',
    lng: 'ru',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
