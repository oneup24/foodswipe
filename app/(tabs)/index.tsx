import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withRepeat,
} from "react-native-reanimated";
import { ScreenContainer } from "@/components/screen-container";
import { SwipeCard } from "@/components/swipe-card";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { StreakBadge } from "@/components/streak-badge";
import { FriendSessionModal } from "@/components/friend-session-modal";
import { useSwipe } from "@/lib/swipe-context";
import { useColors } from "@/hooks/use-colors";
import { useStreak } from "@/hooks/use-streak";
import { SettingsModal } from "@/components/settings-modal";
import { Restaurant } from "@/lib/types";
import { useInterstitialAd, useRewardedAd, AD_UNITS } from "@/lib/ads";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 32;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.62;

function SkeletonCard({ index }: { index: number }) {
  const opacity = useSharedValue(0.4);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0.7, { duration: 450 }), withTiming(0.4, { duration: 450 })),
      -1,
      false
    );
  }, []);
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[
        styles.skeletonCard,
        animStyle,
        { zIndex: 100 - index, top: index * 8, transform: [{ scale: index === 0 ? 1 : 0.95 - index * 0.02 }] },
      ]}
    >
      <View style={styles.skeletonLine1} />
      <View style={styles.skeletonLine2} />
    </Animated.View>
  );
}

export default function DiscoverScreen() {
  const { state, swipeRight, swipeLeft, swipeUp, undoSwipe, resetStack, setFilters, cuisineScores } = useSwipe();
  const colors = useColors();
  const router = useRouter();
  const swipeCountRef = useRef(0);
  const localSwipeCount = useRef(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showFriendModal, setShowFriendModal] = useState(false);
  const syncLikeRef = useRef<((placeId: string) => void) | null>(null);
  const params = useLocalSearchParams<{ openFriendSession?: string }>();

  // Open Friend Session modal when navigated here from Profile tab
  useFocusEffect(
    useCallback(() => {
      if (params.openFriendSession === "1") {
        setShowFriendModal(true);
        router.setParams({ openFriendSession: undefined });
      }
    }, [params.openFriendSession, router])
  );

  // Streak
  const { streakCount, incrementStreak } = useStreak();

  // Cuisine suggestion banner
  const [suggestionCuisine, setSuggestionCuisine] = useState<string | null>(null);
  const suggestionOpacity = useSharedValue(0);

  // Ads
  const {
    isLoaded: isInterstitialLoaded,
    isClosed: isInterstitialClosed,
    load: loadInterstitial,
    show: showInterstitial,
  } = useInterstitialAd(AD_UNITS.interstitial);

  const {
    isLoaded: isRewardedLoaded,
    isEarnedReward,
    load: loadRewarded,
    show: showRewarded,
  } = useRewardedAd(AD_UNITS.rewarded);

  // Load interstitial on mount; reload after it closes
  useEffect(() => { loadInterstitial(); }, [loadInterstitial]);
  useEffect(() => { if (isInterstitialClosed) loadInterstitial(); }, [isInterstitialClosed, loadInterstitial]);

  // Pre-load rewarded ad when stack is running low
  useEffect(() => {
    if (state.cardStack.length <= 3) loadRewarded();
  }, [state.cardStack.length, loadRewarded]);

  // Rewarded ad completed — reset the card stack
  useEffect(() => {
    if (isEarnedReward) resetStack();
  }, [isEarnedReward, resetStack]);

  // Toast animation
  const toastOpacity = useSharedValue(0);
  const toastTranslateY = useSharedValue(0);
  const [toastMessage, setToastMessage] = useState("");

  const showToast = useCallback(
    (msg: string) => {
      setToastMessage(msg);
      toastOpacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(1, { duration: 1200 }),
        withTiming(0, { duration: 300 })
      );
    },
    [toastOpacity]
  );

  const toastStyle = useAnimatedStyle(() => ({
    opacity: toastOpacity.value,
    transform: [{ translateY: toastTranslateY.value }],
  }));

  const suggestionStyle = useAnimatedStyle(() => ({
    opacity: suggestionOpacity.value,
    transform: [{ translateY: withTiming(suggestionOpacity.value === 0 ? -10 : 0, { duration: 300 }) }],
  }));

  const maybeShowInterstitial = useCallback(() => {
    swipeCountRef.current += 1;
    if (swipeCountRef.current % 10 === 0 && isInterstitialLoaded) {
      showInterstitial();
    }
  }, [isInterstitialLoaded, showInterstitial]);

  const maybeShowCuisineSuggestion = useCallback((scores: Record<string, number>) => {
    localSwipeCount.current += 1;
    if (localSwipeCount.current % 10 !== 0) return;

    const topEntry = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    if (!topEntry || topEntry[1] < 4) return;

    const [topCuisine] = topEntry;
    const alreadyFiltered = state.filters.cuisines.includes(topCuisine as any);
    if (alreadyFiltered) return;

    setSuggestionCuisine(topCuisine);
    suggestionOpacity.value = withTiming(1, { duration: 300 });
    setTimeout(() => {
      suggestionOpacity.value = withTiming(0, { duration: 400 });
      setTimeout(() => setSuggestionCuisine(null), 450);
    }, 4000);
  }, [state.filters.cuisines, suggestionOpacity]);

  const handleSwipeRight = useCallback(
    (restaurant: Restaurant) => {
      swipeRight(restaurant);
      showToast(`❤️ Liked ${restaurant.name}!`);
      maybeShowInterstitial();
      incrementStreak();
      maybeShowCuisineSuggestion({ ...cuisineScores, ...Object.fromEntries(restaurant.cuisine.map((c) => [c, (cuisineScores[c] ?? 0) + 2])) });
      if (syncLikeRef.current) syncLikeRef.current(restaurant.id);
    },
    [swipeRight, showToast, maybeShowInterstitial, incrementStreak, maybeShowCuisineSuggestion, cuisineScores]
  );

  const handleSwipeLeft = useCallback(() => {
    swipeLeft();
    maybeShowInterstitial();
    incrementStreak();
  }, [swipeLeft, maybeShowInterstitial, incrementStreak]);

  const handleSwipeUp = useCallback(
    (restaurant: Restaurant) => {
      swipeUp(restaurant);
      showToast(`⭐ Super Liked ${restaurant.name}!`);
      maybeShowInterstitial();
      incrementStreak();
      if (syncLikeRef.current) syncLikeRef.current(restaurant.id);
    },
    [swipeUp, showToast, maybeShowInterstitial, incrementStreak]
  );

  const handlePress = useCallback(
    (restaurant: Restaurant) => {
      router.push({
        pathname: "/restaurant-detail",
        params: { id: restaurant.id },
      });
    },
    [router]
  );

  const handleLikeButton = useCallback(() => {
    if (state.cardStack.length === 0) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const top = state.cardStack[0];
    handleSwipeRight(top);
  }, [state.cardStack, handleSwipeRight]);

  const handlePassButton = useCallback(() => {
    if (state.cardStack.length === 0) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    handleSwipeLeft();
  }, [state.cardStack, handleSwipeLeft]);

  const handleSuperLikeButton = useCallback(() => {
    if (state.cardStack.length === 0) return;
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    const top = state.cardStack[0];
    handleSwipeUp(top);
  }, [state.cardStack, handleSwipeUp]);

  const handleApplyCuisineSuggestion = useCallback(() => {
    if (!suggestionCuisine) return;
    setFilters({ ...state.filters, cuisines: [suggestionCuisine as any] });
    suggestionOpacity.value = withTiming(0, { duration: 300 });
    setTimeout(() => setSuggestionCuisine(null), 350);
    showToast(`✅ Filtering for ${suggestionCuisine}!`);
  }, [suggestionCuisine, state.filters, setFilters, suggestionOpacity, showToast]);

  // Keyboard shortcuts on web (← pass, → like, ↑ super like)
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handleKey = (e: KeyboardEvent) => {
      if (state.cardStack.length === 0) return;
      const top = state.cardStack[0];
      if (e.key === "ArrowRight") { handleSwipeRight(top); }
      else if (e.key === "ArrowLeft") { handleSwipeLeft(); }
      else if (e.key === "ArrowUp") { handleSwipeUp(top); }
      else if (e.key === "z" && state.lastSwiped) { undoSwipe(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [state.cardStack, state.lastSwiped, handleSwipeRight, handleSwipeLeft, handleSwipeUp, undoSwipe]);

  const visibleCards = state.cardStack.slice(0, 4);
  const { isFetchingMore } = state;

  // Quick-filter chips: Open Now, ⭐4+, top cuisine shortcuts
  const quickChips = useMemo(() => {
    const chips: { key: string; label: string; active: boolean }[] = [
      {
        key: "openNow",
        label: "Open Now",
        active: state.filters.openNow,
      },
      {
        key: "rating4",
        label: "⭐ 4+",
        active: state.filters.minRating >= 4,
      },
    ];
    // Add top 3 cuisines from preference scores (if any)
    const topCuisines = Object.entries(cuisineScores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([c]) => c);
    const fallbackCuisines = ["Italian", "Japanese", "Korean"];
    const cuisineList = topCuisines.length >= 1 ? topCuisines : fallbackCuisines;
    cuisineList.forEach((c) => {
      chips.push({
        key: `cuisine_${c}`,
        label: c,
        active: state.filters.cuisines.includes(c as any),
      });
    });
    return chips;
  }, [state.filters, cuisineScores]);

  const handleChipPress = useCallback(
    (chip: { key: string; active: boolean }) => {
      if (Platform.OS !== "web") Haptics.selectionAsync();
      if (chip.key === "openNow") {
        setFilters({ ...state.filters, openNow: !chip.active });
      } else if (chip.key === "rating4") {
        setFilters({ ...state.filters, minRating: chip.active ? 0 : 4 });
      } else if (chip.key.startsWith("cuisine_")) {
        const cuisine = chip.key.replace("cuisine_", "") as any;
        const existing = state.filters.cuisines;
        const next = chip.active
          ? existing.filter((c) => c !== cuisine)
          : [...existing, cuisine];
        setFilters({ ...state.filters, cuisines: next });
      }
    },
    [state.filters, setFilters]
  );

  return (
    <ScreenContainer containerClassName="bg-background" className="flex-1">
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        {/* Location Pill */}
        <Pressable
          onPress={() => router.push("/location-picker")}
          style={({ pressed }) => [
            styles.locationPill,
            { backgroundColor: colors.surface, borderColor: colors.border },
            pressed && { opacity: 0.7 },
          ]}
        >
          <IconSymbol name="location.fill" size={14} color={colors.primary} />
          <Text
            style={[styles.locationText, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {state.location.cityName}
          </Text>
          <IconSymbol name="chevron.down" size={14} color={colors.muted} />
        </Pressable>

        {/* Center: Title + Streak */}
        <View style={styles.titleGroup}>
          <Text style={[styles.appTitle, { color: colors.primary }]}>FoodSwipe</Text>
          <StreakBadge count={streakCount} />
        </View>

        {/* Right buttons */}
        <View style={styles.headerRight}>
          {/* Settings Button */}
          <Pressable
            onPress={() => setShowSettings(true)}
            style={({ pressed }) => [
              styles.filterButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && { opacity: 0.7 },
            ]}
          >
            <IconSymbol name="gearshape.fill" size={18} color={colors.foreground} />
          </Pressable>

          {/* Filter Button */}
          <Pressable
            onPress={() => router.push("/filters")}
            style={({ pressed }) => [
              styles.filterButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && { opacity: 0.7 },
            ]}
          >
            <IconSymbol name="slider.horizontal.3" size={20} color={colors.foreground} />
            {(state.filters.cuisines.length > 0 ||
              state.filters.priceRange.length > 0 ||
              state.filters.openNow ||
              state.filters.minRating > 0 ||
              state.filters.maxDistance < 10) && (
              <View style={[styles.filterDot, { backgroundColor: colors.primary }]} />
            )}
          </Pressable>
        </View>
      </View>

      {/* Quick-filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        style={[styles.chipsScroll, { borderBottomColor: colors.border }]}
      >
        {quickChips.map((chip) => (
          <Pressable
            key={chip.key}
            onPress={() => handleChipPress(chip)}
            style={({ pressed }) => [
              styles.chip,
              chip.active
                ? { backgroundColor: colors.primary, borderColor: colors.primary }
                : { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && { opacity: 0.75 },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: chip.active ? "#fff" : colors.foreground },
              ]}
            >
              {chip.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Cuisine Suggestion Banner */}
      {suggestionCuisine && (
        <Animated.View style={[styles.suggestionBanner, { backgroundColor: colors.surface, borderColor: colors.border }, suggestionStyle]}>
          <Text style={[styles.suggestionText, { color: colors.foreground }]} numberOfLines={1}>
            💡 You love {suggestionCuisine} — filter for it?
          </Text>
          <Pressable
            onPress={handleApplyCuisineSuggestion}
            style={[styles.tryItBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.tryItBtnText}>Try it</Text>
          </Pressable>
          <Pressable onPress={() => { suggestionOpacity.value = withTiming(0, { duration: 300 }); setTimeout(() => setSuggestionCuisine(null), 350); }}>
            <Text style={[styles.dismissText, { color: colors.muted }]}>✕</Text>
          </Pressable>
        </Animated.View>
      )}

      {/* Card Stack Area */}
      <View style={styles.cardArea}>
        {visibleCards.length === 0 ? (
          isFetchingMore ? (
            <View style={[styles.cardStack, { width: CARD_WIDTH }]}>
              <SkeletonCard index={1} />
              <SkeletonCard index={0} />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🍽️</Text>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                You've seen them all!
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
                Check back soon — new spots are added regularly.
              </Text>
              {isRewardedLoaded && (
                <Pressable
                  onPress={showRewarded}
                  style={({ pressed }) => [
                    styles.refreshButton,
                    { backgroundColor: "#FF9500" },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text style={styles.refreshButtonText}>Watch Ad for More</Text>
                </Pressable>
              )}
              <Pressable
                onPress={resetStack}
                style={({ pressed }) => [
                  styles.refreshButton,
                  isRewardedLoaded
                    ? { backgroundColor: "transparent", borderWidth: 1.5, borderColor: colors.border }
                    : { backgroundColor: colors.primary },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <IconSymbol name="arrow.counterclockwise" size={16} color={isRewardedLoaded ? colors.muted : "#fff"} />
                <Text style={[styles.refreshButtonText, isRewardedLoaded && { color: colors.muted }]}>Refresh</Text>
              </Pressable>
            </View>
          )
        ) : (
          <View style={[styles.cardStack, { width: CARD_WIDTH }]}>
            {[...visibleCards].reverse().map((restaurant, reversedIndex) => {
              const index = visibleCards.length - 1 - reversedIndex;
              return (
                <SwipeCard
                  key={restaurant.id}
                  restaurant={restaurant}
                  onSwipeRight={handleSwipeRight}
                  onSwipeLeft={handleSwipeLeft}
                  onSwipeUp={handleSwipeUp}
                  onPress={handlePress}
                  isTop={index === 0}
                  index={index}
                />
              );
            })}
          </View>
        )}
      </View>

      {/* Action Buttons */}
      {visibleCards.length > 0 && (
        <View style={styles.actionRow}>
          {/* Undo */}
          <Pressable
            onPress={() => {
              if (!state.lastSwiped) return;
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              undoSwipe();
            }}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.undoBtn,
              { shadowColor: colors.foreground, borderColor: colors.border, opacity: state.lastSwiped ? 1 : 0.3 },
              pressed && state.lastSwiped && { transform: [{ scale: 0.92 }] },
            ]}
          >
            <Text style={[styles.undoIcon, { color: colors.muted }]}>↩</Text>
          </Pressable>

          {/* Pass */}
          <Pressable
            onPress={handlePassButton}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.passBtn,
              { shadowColor: colors.foreground },
              pressed && { transform: [{ scale: 0.92 }] },
            ]}
          >
            <Text style={styles.passIcon}>✕</Text>
          </Pressable>

          {/* Super Like */}
          <Pressable
            onPress={handleSuperLikeButton}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.superBtn,
              { shadowColor: colors.foreground },
              pressed && { transform: [{ scale: 0.92 }] },
            ]}
          >
            <Text style={styles.superIcon}>★</Text>
          </Pressable>

          {/* Like */}
          <Pressable
            onPress={handleLikeButton}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.likeBtn,
              { shadowColor: colors.foreground },
              pressed && { transform: [{ scale: 0.92 }] },
            ]}
          >
            <Text style={styles.likeIcon}>♥</Text>
          </Pressable>
        </View>
      )}

      {/* Hint text + count */}
      {visibleCards.length > 0 && (
        <Text style={[styles.hint, { color: colors.muted }]}>
          {state.cardStack.length} nearby · Swipe right to like · Up to super like
        </Text>
      )}

      {/* Toast */}
      <Animated.View style={[styles.toast, toastStyle]}>
        <Text style={styles.toastText}>{toastMessage}</Text>
      </Animated.View>

      {/* Settings Modal */}
      <SettingsModal visible={showSettings} onClose={() => setShowSettings(false)} />

      {/* Friend Session Modal */}
      <FriendSessionModal
        visible={showFriendModal}
        onClose={() => setShowFriendModal(false)}
        onSyncLike={(placeId) => { if (syncLikeRef.current) syncLikeRef.current(placeId); }}
        syncLikeRef={syncLikeRef}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  locationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 120,
  },
  locationText: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  titleGroup: {
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    position: "relative",
  },
  filterDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipsScroll: {
    borderBottomWidth: 0.5,
  },
  chipsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  suggestionBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  tryItBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  tryItBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  dismissText: {
    fontSize: 14,
    fontWeight: "600",
  },
  cardArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
  },
  cardStack: {
    height: "100%",
    position: "relative",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 8,
  },
  refreshButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
    paddingVertical: 16,
    paddingBottom: 8,
  },
  actionBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  undoBtn: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  undoIcon: {
    fontSize: 18,
    fontWeight: "600",
  },
  passBtn: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#FF3B30",
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  superBtn: {
    backgroundColor: "#007AFF",
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  likeBtn: {
    backgroundColor: "#FF4B4B",
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  passIcon: {
    fontSize: 22,
    color: "#FF3B30",
    fontWeight: "700",
  },
  superIcon: {
    fontSize: 22,
    color: "#fff",
    fontWeight: "700",
  },
  likeIcon: {
    fontSize: 22,
    color: "#fff",
    fontWeight: "700",
  },
  hint: {
    textAlign: "center",
    fontSize: 12,
    paddingBottom: 8,
  },
  toast: {
    position: "absolute",
    top: 80,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
  },
  toastText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  skeletonCard: {
    position: "absolute",
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    backgroundColor: "rgba(128,128,128,0.12)",
    alignSelf: "center",
    overflow: "hidden",
    justifyContent: "flex-end",
    padding: 20,
    gap: 10,
  },
  skeletonLine1: {
    height: 20,
    borderRadius: 10,
    width: "55%",
    backgroundColor: "rgba(128,128,128,0.25)",
  },
  skeletonLine2: {
    height: 14,
    borderRadius: 7,
    width: "38%",
    backgroundColor: "rgba(128,128,128,0.18)",
  },
});
