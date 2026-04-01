import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LANGUAGE_KEY } from '@/lib/i18n';

export function useLanguage() {
  const { i18n, t } = useTranslation();

  const changeLanguage = useCallback(
    async (lang: string) => {
      try {
        await i18n.changeLanguage(lang);
        await AsyncStorage.setItem(LANGUAGE_KEY, lang);
      } catch (e) {
        console.error('Failed to change language:', e);
      }
    },
    [i18n]
  );

  const currentLanguage = i18n.language;

  return {
    currentLanguage,
    changeLanguage,
    t,
    i18n,
  };
}
