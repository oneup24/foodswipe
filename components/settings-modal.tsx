import React, { useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  Platform,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/use-colors';
import { useLanguage } from '@/hooks/use-language';
import { useSwipe } from '@/lib/swipe-context';
import { useThemeContext } from '@/lib/theme-provider';
import AsyncStorage from '@react-native-async-storage/async-storage';

type SettingsModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const colors = useColors();
  const router = useRouter();
  const { currentLanguage, changeLanguage, t } = useLanguage();
  const { state, unlike } = useSwipe();
  const { colorScheme, toggleColorScheme } = useThemeContext();

  const isDark = colorScheme === 'dark';

  const languages = [
    { code: 'en', label: t('common.english'), flag: '🇺🇸' },
    { code: 'es', label: t('common.spanish'), flag: '🇪🇸' },
    { code: 'ja', label: t('common.japanese'), flag: '🇯🇵' },
    { code: 'zh-HK', label: t('common.chineseHK'), flag: '🇭🇰' },
  ];

  const handleClearLiked = useCallback(() => {
    Alert.alert(
      'Clear All Liked',
      'This will remove all your saved restaurants. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            const ids = state.likedRestaurants.map((r) => r.id);
            ids.forEach((id) => unlike(id));
            await AsyncStorage.removeItem('@foodswipe_plans');
            await AsyncStorage.removeItem('@foodswipe_lists');
          },
        },
      ]
    );
  }, [state.likedRestaurants, unlike]);

  const handlePrivacy = useCallback(() => {
    onClose();
    setTimeout(() => router.push('/privacy-policy'), 300);
  }, [onClose, router]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerSpacer} />
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {t('common.settings')}
          </Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={[styles.closeText, { color: colors.primary }]}>
              {t('common.close')}
            </Text>
          </Pressable>
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ── Appearance ── */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Appearance</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.settingRow}>
                <Text style={styles.settingIcon}>{isDark ? '🌙' : '☀️'}</Text>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>
                  {isDark ? 'Dark Mode' : 'Light Mode'}
                </Text>
                <Switch
                  value={isDark}
                  onValueChange={toggleColorScheme}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          </View>

          {/* ── Language ── */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('common.language')}</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {languages.map((lang, index) => (
                <React.Fragment key={lang.code}>
                  <Pressable
                    style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.7 }]}
                    onPress={() => changeLanguage(lang.code)}
                  >
                    <Text style={styles.settingIcon}>{lang.flag}</Text>
                    <Text style={[styles.settingLabel, { color: colors.foreground }]}>{lang.label}</Text>
                    {currentLanguage === lang.code && (
                      <Text style={[styles.checkmark, { color: colors.primary }]}>✓</Text>
                    )}
                  </Pressable>
                  {index < languages.length - 1 && (
                    <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>

          {/* ── Data & Privacy ── */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Data & Privacy</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Pressable
                style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.7 }]}
                onPress={handlePrivacy}
              >
                <Text style={styles.settingIcon}>📄</Text>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>Privacy Policy</Text>
                <Text style={[styles.settingArrow, { color: colors.muted }]}>›</Text>
              </Pressable>
              <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
              <Pressable
                style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.7 }]}
                onPress={handleClearLiked}
              >
                <Text style={styles.settingIcon}>🗑️</Text>
                <Text style={[styles.settingLabel, { color: '#FF3B30' }]}>Clear All Liked</Text>
              </Pressable>
            </View>
          </View>

          {/* ── About ── */}
          <View style={[styles.aboutRow]}>
            <Text style={[styles.aboutText, { color: colors.muted }]}>FoodSwipe · Made with ❤️</Text>
          </View>

        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  headerSpacer: { width: 48 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  closeText: { fontSize: 16, fontWeight: '600', width: 48, textAlign: 'right' },
  scroll: { flex: 1 },
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    paddingLeft: 4,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  settingIcon: { fontSize: 20, width: 28 },
  settingLabel: { flex: 1, fontSize: 16, fontWeight: '500' },
  settingArrow: { fontSize: 20, fontWeight: '600' },
  checkmark: { fontSize: 18, fontWeight: '700' },
  rowDivider: { height: 0.5, marginLeft: 54 },
  aboutRow: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingBottom: 40,
  },
  aboutText: { fontSize: 13, fontWeight: '500' },
});
