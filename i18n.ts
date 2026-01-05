import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

// Ensure these paths are correct!
import en from './locales/en/translation.json';
import fi from './locales/fi/translation.json';

const resources = {
  en: { translation: en },
  fi: { translation: fi },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: Localization.getLocales()[0].languageCode || 'en', // New Expo SDK way
    fallbackLng: 'en',
    compatibilityJSON: 'v3',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false, // 👈 MUST BE FALSE
    },
  });

export default i18n;