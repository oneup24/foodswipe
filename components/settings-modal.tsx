import React, { useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { useLanguage } from '@/hooks/use-language';

type SettingsModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const colors = useColors();
  const { currentLanguage, changeLanguage, t } = useLanguage();

  const languages = [
    { code: 'en', label: t('common.english') },
    { code: 'es', label: t('common.spanish') },
    { code: 'ja', label: t('common.japanese') },
    { code: 'zh-HK', label: t('common.chineseHK') },
  ];

  const handleLanguageChange = useCallback(
    (lang: string) => {
      changeLanguage(lang);
    },
    [changeLanguage]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose}>
            <Text style={[styles.headerButton, { color: colors.tint }]}>
              {t('common.close')}
            </Text>
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {t('common.settings')}
          </Text>
          <View style={styles.headerButton} />
        </View>

        <ScrollView style={styles.content}>
          {/* Language Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              {t('common.language')}
            </Text>

            <View
              style={[
                styles.languageBox,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              {languages.map((lang, index) => (
                <React.Fragment key={lang.code}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.languageOption,
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => handleLanguageChange(lang.code)}
                  >
                    <Text style={[styles.languageLabel, { color: colors.foreground }]}>
                      {lang.label}
                    </Text>
                    {currentLanguage === lang.code && (
                      <Text style={[styles.checkmark, { color: colors.tint }]}>✓</Text>
                    )}
                  </Pressable>
                  {index < languages.length - 1 && (
                    <View
                      style={[styles.divider, { backgroundColor: colors.border }]}
                    />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerButton: {
    fontSize: 16,
    fontWeight: '600',
    width: 60,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  languageBox: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  languageLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  checkmark: {
    fontSize: 18,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
});
