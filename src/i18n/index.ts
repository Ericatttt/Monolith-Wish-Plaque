import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import zh from './zh';
import en from './en';

const LANGUAGE_STORAGE_KEY = '@wish_wall_language';

const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (lang: string) => void) => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      callback(savedLanguage ?? 'zh');
    } catch {
      callback('zh');
    }
  },
  init: () => {},
  cacheUserLanguage: async (language: string) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // silent fail
    }
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      zh: { translation: zh },
      en: { translation: en },
    },
    fallbackLng: 'zh',
    supportedLngs: ['zh', 'en'],
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export const switchLanguage = async (lang: 'zh' | 'en') => {
  await i18n.changeLanguage(lang);
};

export const getCurrentLanguage = (): string => i18n.language;

export default i18n;
