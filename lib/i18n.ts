import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import all locale files
import enCommon from '../locales/en/common.json';
import esCommon from '../locales/es/common.json';
import jaCommon from '../locales/ja/common.json';
import zhHKCommon from '../locales/zh-HK/common.json';

const LANGUAGE_KEY = '@foodswipe_language';

const resources = {
  en: {
    common: enCommon,
  },
  es: {
    common: esCommon,
  },
  ja: {
    common: jaCommon,
  },
  'zh-HK': {
    common: zhHKCommon,
  },
};

// Detect device language
const getDeviceLanguage = () => {
  const locale = Localization.getLocales()[0]?.languageCode;
  const regionCode = Localization.getLocales()[0]?.regionCode;
  
  // Map to supported languages
  if (locale?.startsWith('es')) return 'es';
  if (locale?.startsWith('ja')) return 'ja';
  if (locale?.startsWith('zh')) {
    // Check if it's Hong Kong Chinese
    if (regionCode === 'HK' || locale === 'zh-HK') return 'zh-HK';
    return 'en'; // Default to English for other Chinese variants
  }
  return 'en'; // Default to English
};

// Initialize i18n
const initializeI18n = async () => {
  try {
    // Try to get saved language preference
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    const language = savedLanguage || getDeviceLanguage();

    await i18n.use(initReactI18next).init({
      resources,
      lng: language,
      fallbackLng: 'en',
      defaultNS: 'common',
      ns: ['common'],
      interpolation: {
        escapeValue: false, // React already handles XSS
      },
    });
  } catch (e) {
    console.error('Failed to initialize i18n:', e);
    // Fallback initialization
    i18n.use(initReactI18next).init({
      resources,
      lng: 'en',
      fallbackLng: 'en',
      defaultNS: 'common',
      ns: ['common'],
      interpolation: {
        escapeValue: false,
      },
    });
  }
};

export { initializeI18n, LANGUAGE_KEY };
export default i18n;
