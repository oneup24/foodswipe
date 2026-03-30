import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { ScreenContainer } from "@/components/screen-container";
import { SwipeCard } from "@/components/swipe-card";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useSwipe } from "@/lib/swipe-context";
import { useColors } from "@/hooks/use-colors";
import { Restaurant } from "@/lib/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 32;

export default function DiscoverScreen() {
  const { state, swipeRight, swipeLeft, swipeUp, resetStack } = useSwipe();
  const colors = useColors();
  const router = useRouter();
  const [showFilters, setShowFilters] = useState(false);

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

  const handleSwipeRight = useCallback(
    (restaurant: Restaurant) => {
      swipeRight(restaurant);
      showToast(`❤️ Liked ${restaurant.name}!`);
    },
    [swipeRight, showToast]
  );

  const handleSwipeLeft = useCallback(() => {
    swipeLeft();
  }, [swipeLeft]);

  const handleSwipeUp = useCallback(
    (restaurant: Restaurant) => {
      swipeUp(restaurant);
      showToast(`⭐ Super Liked ${restaurant.name}!`);
    },
    [swipeUp, showToast]
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
    swipeRight(top);
    showToast(`❤️ Liked ${top.name}!`);
  }, [state.cardStack, swipeRight, showToast]);

  const handlePassButton = useCallback(() => {
    if (state.cardStack.length === 0) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    swipeLeft();
  }, [state.cardStack, swipeLeft]);

  const handleSuperLikeButton = useCallback(() => {
    if (state.cardStack.length === 0) return;
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    const top = state.cardStack[0];
    swipeUp(top);
    showToast(`⭐ Super Liked ${top.name}!`);
  }, [state.cardStack, swipeUp, showToast]);

  const visibleCards = state.cardStack.slice(0, 4);
  const { isFetchingMore } = state;

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

        {/* App Title */}
        <Text style={[styles.appTitle, { color: colors.primary }]}>FoodSwipe</Text>

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

      {/* Card Stack Area */}
      <View style={styles.cardArea}>
        {visibleCards.length === 0 ? (
          isFetchingMore ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.emptySubtitle, { color: colors.muted, marginTop: 12 }]}>
                Finding more restaurants…
              </Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🍽️</Text>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                You've seen them all!
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
                Try adjusting your filters or change location to discover more restaurants.
              </Text>
              <Pressable
                onPress={resetStack}
                style={({ pressed }) => [
                  styles.refreshButton,
                  { backgroundColor: colors.primary },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <IconSymbol name="arrow.counterclockwise" size={16} color="#fff" />
                <Text style={styles.refreshButtonText}>Refresh</Text>
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

      {/* Hint text */}
      {visibleCards.length > 0 && (
        <Text style={[styles.hint, { color: colors.muted }]}>
          Swipe right to like · Swipe up to super like
        </Text>
      )}

      {/* Toast */}
      <Animated.View style={[styles.toast, toastStyle]}>
        <Text style={styles.toastText}>{toastMessage}</Text>
      </Animated.View>
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
    maxWidth: 140,
  },
  locationText: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
});
