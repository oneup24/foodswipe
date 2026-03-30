import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  Platform,
  Share,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useSwipe } from "@/lib/swipe-context";
import { useColors } from "@/hooks/use-colors";
import { MOCK_RESTAURANTS } from "@/lib/mock-data";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function RestaurantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state, swipeRight, swipeLeft, unlike } = useSwipe();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const restaurant = MOCK_RESTAURANTS.find((r) => r.id === id);
  const isLiked = state.likedRestaurants.some((r) => r.id === id);

  const handleLike = useCallback(() => {
    if (!restaurant) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (isLiked) {
      unlike(restaurant.id);
    } else {
      swipeRight(restaurant);
    }
  }, [restaurant, isLiked, swipeRight, unlike]);

  const handleShare = useCallback(async () => {
    if (!restaurant) return;
    try {
      await Share.share({
        message: `Check out ${restaurant.name}! ${restaurant.cuisine.join(", ")} · ${restaurant.address} · Rating: ${restaurant.rating}/5`,
        title: restaurant.name,
      });
    } catch {}
  }, [restaurant]);

  if (!restaurant) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground }}>Restaurant not found</Text>
      </View>
    );
  }

  const priceString = "$".repeat(restaurant.priceLevel);
  const priceLabel = ["", "Budget", "Moderate", "Upscale", "Fine Dining"][restaurant.priceLevel];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Hero Image */}
      <View style={styles.heroContainer}>
        <Image
          source={{ uri: restaurant.imageUrl }}
          style={styles.heroImage}
          contentFit="cover"
        />
        {/* Close button */}
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.closeButton,
            { top: insets.top + 12 },
            pressed && { opacity: 0.7 },
          ]}
        >
          <IconSymbol name="xmark" size={18} color="#fff" />
        </Pressable>

        {/* Share button */}
        <Pressable
          onPress={handleShare}
          style={({ pressed }) => [
            styles.shareButton,
            { top: insets.top + 12 },
            pressed && { opacity: 0.7 },
          ]}
        >
          <IconSymbol name="square.and.arrow.up" size={18} color="#fff" />
        </Pressable>

        {/* Open/Closed badge */}
        <View
          style={[
            styles.openBadge,
            { backgroundColor: restaurant.isOpen ? "#34C759" : "#FF3B30" },
          ]}
        >
          <Text style={styles.openBadgeText}>
            {restaurant.isOpen ? "● Open Now" : "● Closed"}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentInner,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Name & Price */}
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={2}>
            {restaurant.name}
          </Text>
          <Text style={[styles.price, { color: colors.warning }]}>{priceString}</Text>
        </View>

        {/* Rating Row */}
        <View style={styles.ratingRow}>
          <Text style={styles.star}>★</Text>
          <Text style={[styles.rating, { color: colors.foreground }]}>
            {restaurant.rating.toFixed(1)}
          </Text>
          <Text style={[styles.reviewCount, { color: colors.muted }]}>
            ({restaurant.reviewCount.toLocaleString()} reviews)
          </Text>
        </View>

        {/* Cuisine Tags */}
        <View style={styles.tagsRow}>
          {restaurant.cuisine.map((c) => (
            <View key={c} style={[styles.tag, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.tagText, { color: colors.foreground }]}>{c}</Text>
            </View>
          ))}
          <View style={[styles.tag, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.tagText, { color: colors.warning }]}>{priceLabel}</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Info Rows */}
        <View style={styles.infoSection}>
          {/* Address */}
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: colors.surface }]}>
              <IconSymbol name="mappin.and.ellipse" size={18} color={colors.primary} />
            </View>
            <View style={styles.infoText}>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>Address</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {restaurant.address}
              </Text>
            </View>
          </View>

          {/* Distance */}
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: colors.surface }]}>
              <IconSymbol name="location.fill" size={18} color={colors.primary} />
            </View>
            <View style={styles.infoText}>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>Distance</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {restaurant.distance.toFixed(1)} km away
              </Text>
            </View>
          </View>

          {/* Hours */}
          {restaurant.openingHours && (
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: colors.surface }]}>
                <IconSymbol name="clock.fill" size={18} color={colors.primary} />
              </View>
              <View style={styles.infoText}>
                <Text style={[styles.infoLabel, { color: colors.muted }]}>Hours</Text>
                <Text style={[styles.infoValue, { color: colors.foreground }]}>
                  {restaurant.openingHours}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Description */}
        {restaurant.description && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.descSection}>
              <Text style={[styles.descTitle, { color: colors.foreground }]}>About</Text>
              <Text style={[styles.descText, { color: colors.muted }]}>
                {restaurant.description}
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View
        style={[
          styles.actionBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + 12,
          },
        ]}
      >
        <Pressable
          onPress={() => {
            router.back();
            setTimeout(() => swipeLeft(), 100);
          }}
          style={({ pressed }) => [
            styles.actionBtn,
            styles.passBtn,
            pressed && { transform: [{ scale: 0.94 }] },
          ]}
        >
          <Text style={styles.passIcon}>✕</Text>
          <Text style={styles.passLabel}>Pass</Text>
        </Pressable>

        <Pressable
          onPress={handleLike}
          style={({ pressed }) => [
            styles.actionBtn,
            styles.likeBtn,
            { backgroundColor: isLiked ? "#34C759" : "#FF4B4B" },
            pressed && { transform: [{ scale: 0.94 }] },
          ]}
        >
          <Text style={styles.likeIcon}>{isLiked ? "✓" : "♥"}</Text>
          <Text style={styles.likeLabel}>{isLiked ? "Liked!" : "Like"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroContainer: {
    width: "100%",
    height: SCREEN_HEIGHT * 0.42,
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  closeButton: {
    position: "absolute",
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  shareButton: {
    position: "absolute",
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  openBadge: {
    position: "absolute",
    bottom: 16,
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  openBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 20,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
  },
  name: {
    fontSize: 26,
    fontWeight: "800",
    flex: 1,
    lineHeight: 32,
  },
  price: {
    fontSize: 18,
    fontWeight: "700",
    paddingTop: 4,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
  },
  star: {
    color: "#FFD60A",
    fontSize: 16,
  },
  rating: {
    fontSize: 16,
    fontWeight: "700",
  },
  reviewCount: {
    fontSize: 14,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 13,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  infoSection: {
    gap: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  infoText: {
    flex: 1,
    justifyContent: "center",
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
  descSection: {
    gap: 8,
  },
  descTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  descText: {
    fontSize: 15,
    lineHeight: 22,
  },
  actionBar: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 0.5,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
  },
  passBtn: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#FF3B30",
  },
  likeBtn: {
    backgroundColor: "#FF4B4B",
  },
  passIcon: {
    fontSize: 18,
    color: "#FF3B30",
    fontWeight: "700",
  },
  passLabel: {
    fontSize: 16,
    color: "#FF3B30",
    fontWeight: "700",
  },
  likeIcon: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "700",
  },
  likeLabel: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "700",
  },
});
