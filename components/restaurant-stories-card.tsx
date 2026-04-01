import React, { forwardRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Restaurant } from "@/lib/types";

export const STORIES_CARD_WIDTH = 360;
export const STORIES_CARD_HEIGHT = 640; // 9:16 aspect ratio

type Props = {
  restaurant: Restaurant;
  userPhoto?: string; // optional meal photo URI to use as background
};

export const RestaurantStoriesCard = forwardRef<View, Props>(({ restaurant, userPhoto }, ref) => {
  const backgroundPhoto = userPhoto ?? restaurant.photos?.[0] ?? restaurant.imageUrl;
  const priceString = "$".repeat(restaurant.priceLevel);

  return (
    <View ref={ref} style={styles.card}>
      {/* Background photo */}
      <Image source={{ uri: backgroundPhoto }} style={styles.bg} contentFit="cover" />

      {/* Overlays */}
      <View style={styles.overlayTop} />
      <View style={styles.overlayBottom} />

      {/* Top: Brand pill */}
      <View style={styles.topContent}>
        <View style={styles.brandPill}>
          <Text style={styles.brandText}>🍽 FoodSwipe</Text>
        </View>
        {userPhoto && (
          <View style={styles.mealBadge}>
            <Text style={styles.mealBadgeText}>My Meal 📸</Text>
          </View>
        )}
      </View>

      {/* Bottom: Restaurant info */}
      <View style={styles.bottomContent}>
        <Text style={styles.restaurantName} numberOfLines={2}>
          {restaurant.name}
        </Text>

        {/* Tags row */}
        <View style={styles.tagsRow}>
          {restaurant.cuisine.slice(0, 2).map((c) => (
            <View key={c} style={styles.tag}>
              <Text style={styles.tagText}>{c}</Text>
            </View>
          ))}
          <View style={[styles.tag, styles.priceTag]}>
            <Text style={styles.tagText}>{priceString}</Text>
          </View>
        </View>

        {/* Rating */}
        <View style={styles.ratingRow}>
          <Text style={styles.star}>★</Text>
          <Text style={styles.rating}>{restaurant.rating.toFixed(1)}</Text>
          <Text style={styles.ratingMeta}>
            ({restaurant.reviewCount.toLocaleString()} reviews) · {restaurant.distance.toFixed(1)} km
          </Text>
        </View>

        {/* Address */}
        <Text style={styles.address} numberOfLines={2}>
          📍 {restaurant.address}
        </Text>

        {/* CTA */}
        <View style={styles.ctaRow}>
          <View style={styles.ctaPill}>
            <Text style={styles.ctaText}>Discover on FoodSwipe →</Text>
          </View>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    width: STORIES_CARD_WIDTH,
    height: STORIES_CARD_HEIGHT,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#111",
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 160,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  overlayBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "50%",
    backgroundColor: "rgba(0,0,0,0.75)",
  },
  topContent: {
    position: "absolute",
    top: 28,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandPill: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 22,
  },
  brandText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  mealBadge: {
    backgroundColor: "rgba(255,75,75,0.8)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  mealBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  bottomContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 28,
    gap: 10,
  },
  restaurantName: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "900",
    lineHeight: 37,
    letterSpacing: -0.5,
  },
  tagsRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  tag: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  priceTag: {
    backgroundColor: "rgba(255,215,0,0.2)",
    borderColor: "rgba(255,215,0,0.4)",
  },
  tagText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  star: { color: "#FFD60A", fontSize: 15 },
  rating: { color: "#fff", fontSize: 15, fontWeight: "700" },
  ratingMeta: { color: "rgba(255,255,255,0.65)", fontSize: 13 },
  address: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  ctaRow: {
    marginTop: 4,
  },
  ctaPill: {
    alignSelf: "flex-start",
    backgroundColor: "#FF4B4B",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  ctaText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
});
