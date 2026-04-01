import React, { forwardRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Restaurant } from "@/lib/types";

export const SHARE_CARD_WIDTH = 360;
export const SHARE_CARD_HEIGHT = 450;

type Props = {
  restaurant: Restaurant;
};

export const RestaurantShareCard = forwardRef<View, Props>(({ restaurant }, ref) => {
  const priceString = "$".repeat(restaurant.priceLevel);
  const cuisine = restaurant.cuisine.slice(0, 2).join(" · ") || "Restaurant";
  const photo = restaurant.photos?.[0] ?? restaurant.imageUrl;

  return (
    <View ref={ref} style={styles.card}>
      {/* Background photo */}
      <Image source={{ uri: photo }} style={styles.bg} contentFit="cover" />

      {/* Gradient layers */}
      <View style={styles.gradientTop} />
      <View style={styles.gradientBottom} />

      {/* Brand header */}
      <View style={styles.header}>
        <View style={styles.brandPill}>
          <Text style={styles.brandText}>🍽 FoodSwipe</Text>
        </View>
      </View>

      {/* Restaurant info footer */}
      <View style={styles.footer}>
        <Text style={styles.name} numberOfLines={2}>
          {restaurant.name}
        </Text>

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

        <View style={styles.ratingRow}>
          <Text style={styles.star}>★</Text>
          <Text style={styles.rating}>{restaurant.rating.toFixed(1)}</Text>
          <Text style={styles.reviews}>
            ({restaurant.reviewCount.toLocaleString()} reviews)
          </Text>
          <View style={styles.dot} />
          <Text style={styles.distance}>{restaurant.distance.toFixed(1)} km</Text>
        </View>

        <Text style={styles.address} numberOfLines={1}>
          📍 {restaurant.address}
        </Text>

        <View style={styles.divider} />
        <Text style={styles.cta}>Discover more on FoodSwipe →</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    width: SHARE_CARD_WIDTH,
    height: SHARE_CARD_HEIGHT,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#111",
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
  },
  gradientTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  gradientBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "65%",
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  header: {
    position: "absolute",
    top: 20,
    left: 20,
    right: 20,
  },
  brandPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  brandText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 22,
    paddingBottom: 20,
    gap: 8,
  },
  name: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 31,
    letterSpacing: -0.3,
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
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 14,
  },
  priceTag: {
    backgroundColor: "rgba(255,215,0,0.2)",
    borderColor: "rgba(255,215,0,0.4)",
  },
  tagText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  star: {
    color: "#FFD60A",
    fontSize: 14,
  },
  rating: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  reviews: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  distance: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
  },
  address: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginVertical: 2,
  },
  cta: {
    color: "#FF6B6B",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
