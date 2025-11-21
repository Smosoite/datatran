import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

// Import your translation files
import en from './locales/en/translation.json';
import fi from './locales/fi/translation.json';

const resources = {
  en: {
    translation: en,
  },
  fi: {
    translation: fi,
  },
};

i18n
  .use(initReactI18next) // This passes i18n down to react-i18next
  .init({
    resources,
    lng: Localization.locale?.split('-')[0] || 'en', // Safely detect language
    fallbackLng: 'en',
    compatibilityJSON: 'v3', // Add this for compatibility
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;