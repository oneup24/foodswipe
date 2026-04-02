import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useSwipe } from "@/lib/swipe-context";
import { useStreak } from "@/hooks/use-streak";
import { useColors } from "@/hooks/use-colors";
import { useLanguage } from "@/hooks/use-language";
import { SettingsModal } from "@/components/settings-modal";
import { FriendSessionModal } from "@/components/friend-session-modal";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state } = useSwipe();
  const { streakCount } = useStreak();
  const { t } = useLanguage();

  const [showSettings, setShowSettings] = useState(false);
  const [showFriendModal, setShowFriendModal] = useState(false);

  // Taste profile — top 5 cuisines by score
  const topCuisines = useMemo(() => {
    const scores = state.cuisineScores ?? {};
    return Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .filter(([, score]) => score > 0);
  }, [state.cuisineScores]);

  const maxScore = topCuisines[0]?.[1] ?? 1;

  const cuisinesExplored = topCuisines.length;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { borderBottomColor: colors.border, paddingTop: insets.top + 8 },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Profile
        </Text>
        <Pressable
          onPress={() => setShowSettings(true)}
          hitSlop={10}
          style={({ pressed }) => [styles.gearBtn, pressed && { opacity: 0.6 }]}
        >
          <IconSymbol name="gearshape.fill" size={22} color={colors.muted} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View
            style={[
              styles.statCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={styles.statEmoji}>🔥</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {streakCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>
              Day Streak
            </Text>
          </View>
          <View
            style={[
              styles.statCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={styles.statEmoji}>❤️</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {state.likedRestaurants.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>
              Saved
            </Text>
          </View>
          <View
            style={[
              styles.statCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={styles.statEmoji}>🍜</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {cuisinesExplored}
            </Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>
              Cuisines
            </Text>
          </View>
        </View>

        {/* Friend Session Card */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Social
          </Text>
          <Pressable
            onPress={() => setShowFriendModal(true)}
            style={({ pressed }) => [
              styles.friendCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && { opacity: 0.85 },
            ]}
          >
            <View style={[styles.friendIcon, { backgroundColor: colors.primary + "18" }]}>
              <Text style={styles.friendEmoji}>👥</Text>
            </View>
            <View style={styles.friendText}>
              <Text style={[styles.friendTitle, { color: colors.foreground }]}>
                Swipe with Friends
              </Text>
              <Text style={[styles.friendSub, { color: colors.muted }]}>
                Match on the same restaurants together
              </Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.muted} />
          </Pressable>
        </View>

        {/* Taste Profile */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Your Taste Profile
          </Text>
          {topCuisines.length > 0 ? (
            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              {topCuisines.map(([cuisine, score], i) => (
                <View key={cuisine} style={styles.cuisineRow}>
                  <View style={styles.cuisineLeft}>
                    <Text style={[styles.cuisineRank, { color: colors.muted }]}>
                      #{i + 1}
                    </Text>
                    <Text
                      style={[styles.cuisineName, { color: colors.foreground }]}
                      numberOfLines={1}
                    >
                      {cuisine}
                    </Text>
                  </View>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.bar,
                        {
                          width: `${(score / maxScore) * 100}%` as any,
                          backgroundColor:
                            i === 0 ? colors.primary : colors.primary + "60",
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View
              style={[
                styles.emptyProfile,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={styles.emptyEmoji}>🍽️</Text>
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                Start swiping to build your taste profile
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
      />

      <FriendSessionModal
        visible={showFriendModal}
        onClose={() => setShowFriendModal(false)}
        onSyncLike={() => {
          // Sync is handled via the Discover screen's swipe handlers.
          // This modal is for session setup only; actual like syncing
          // occurs in index.tsx when the session ref is active.
        }}
        syncLikeRef={{ current: null }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 28, fontWeight: "800" },
  gearBtn: { padding: 4 },
  scroll: { flex: 1 },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 4,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  statEmoji: { fontSize: 24 },
  statValue: { fontSize: 22, fontWeight: "900" },
  statLabel: { fontSize: 11, fontWeight: "500" },
  section: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
    paddingLeft: 4,
  },
  friendCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  friendIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  friendEmoji: { fontSize: 22 },
  friendText: { flex: 1 },
  friendTitle: { fontSize: 16, fontWeight: "600" },
  friendSub: { fontSize: 13, marginTop: 2 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  cuisineRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  cuisineLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: 140,
  },
  cuisineRank: { fontSize: 12, fontWeight: "600", width: 24 },
  cuisineName: { fontSize: 14, fontWeight: "600", flex: 1 },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: "rgba(128,128,128,0.15)",
    borderRadius: 4,
    overflow: "hidden",
  },
  bar: { height: "100%", borderRadius: 4 },
  emptyProfile: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  emptyEmoji: { fontSize: 32 },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
