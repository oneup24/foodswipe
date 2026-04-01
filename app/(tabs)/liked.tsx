import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Dimensions,
  Alert,
  Share,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useSwipe } from "@/lib/swipe-context";
import { useColors } from "@/hooks/use-colors";
import { useLanguage } from "@/hooks/use-language";
import { Restaurant } from "@/lib/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.3;

function RestaurantCard({
  restaurant,
  onPress,
  onUnlike,
}: {
  restaurant: Restaurant;
  onPress: (r: Restaurant) => void;
  onUnlike: (id: string) => void;
}) {
  const colors = useColors();
  const { t, currentLanguage } = useLanguage();

  const handleLongPress = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const displayName = restaurant.nameLocalized?.[currentLanguage] || restaurant.name;
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name)}&query_place_id=${restaurant.id}`;
    Alert.alert(
      displayName,
      `${restaurant.cuisine[0] ?? "Restaurant"} · ${"$".repeat(restaurant.priceLevel)} · ${restaurant.rating}/5`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Share",
          onPress: () =>
            Share.share({
              title: displayName,
              message: `${displayName}\n${restaurant.cuisine.join(" · ")} · ${"$".repeat(restaurant.priceLevel)}\nRating: ${restaurant.rating}/5 · ${restaurant.distance.toFixed(1)}km away\n${restaurant.address}\n\n${mapsUrl}`,
            }),
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => onUnlike(restaurant.id),
        },
      ]
    );
  }, [restaurant, onUnlike, currentLanguage]);

  return (
    <Pressable
      onPress={() => onPress(restaurant)}
      onLongPress={handleLongPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          shadowColor: colors.foreground,
        },
        pressed && { opacity: 0.85 },
      ]}
    >
      <Image
        source={{ uri: restaurant.photos?.[0] ?? restaurant.imageUrl }}
        style={styles.cardImage}
        contentFit="cover"
        transition={200}
      />
      <View style={styles.cardOverlay} />
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>
          {restaurant.nameLocalized?.[currentLanguage] || restaurant.name}
        </Text>
        <Text style={styles.cardCuisine} numberOfLines={1}>
          {(() => {
            const key = restaurant.cuisine[0]?.toLowerCase().replace(/\s+/g, '');
            return t(`cuisines.${key}`) || restaurant.cuisine[0];
          })()}
        </Text>
        <View style={styles.cardMeta}>
          <Text style={styles.cardStar}>★</Text>
          <Text style={styles.cardRating}>{restaurant.rating.toFixed(1)}</Text>
          <Text style={styles.cardDot}>·</Text>
          <Text style={styles.cardPrice}>{"$".repeat(restaurant.priceLevel)}</Text>
        </View>
      </View>
      {/* Open/Closed indicator */}
      <View
        style={[
          styles.openDot,
          { backgroundColor: restaurant.isOpen ? "#34C759" : "#FF3B30" },
        ]}
      />
    </Pressable>
  );
}

export default function LikedScreen() {
  const { state, unlike } = useSwipe();
  const colors = useColors();
  const { t } = useLanguage();
  const router = useRouter();

  const handlePrivacy = useCallback(() => {
    router.push("/privacy-policy");
  }, [router]);

  const handlePress = useCallback(
    (restaurant: Restaurant) => {
      router.push({
        pathname: "/restaurant-detail",
        params: { id: restaurant.id },
      });
    },
    [router]
  );

  const handleUnlike = useCallback(
    (id: string) => {
      unlike(id);
    },
    [unlike]
  );

  const renderItem = useCallback(
    ({ item }: { item: Restaurant }) => (
      <RestaurantCard
        restaurant={item}
        onPress={handlePress}
        onUnlike={handleUnlike}
      />
    ),
    [handlePress, handleUnlike]
  );

  return (
    <ScreenContainer containerClassName="bg-background" className="flex-1">
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {t('common.liked')}
          </Text>
          {state.likedRestaurants.length > 0 && (
            <View style={[styles.countBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.countText}>{state.likedRestaurants.length}</Text>
            </View>
          )}
        </View>
        {state.likedRestaurants.length > 0 && (
          <Text style={[styles.headerSub, { color: colors.muted }]}>Most recent first</Text>
        )}
      </View>

      {state.likedRestaurants.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>💔</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No liked restaurants yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            Swipe right or tap the heart button on the Discover tab to save your favorites here.
          </Text>
          <Pressable
            onPress={() => router.push("/")}
            style={({ pressed }) => [
              styles.discoverButton,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.8 },
            ]}
          >
            <IconSymbol name="fork.knife" size={16} color="#fff" />
            <Text style={styles.discoverButtonText}>Start Discovering</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <Text style={[styles.hintText, { color: colors.muted }]}>
            Long press to share or remove · Tap to view details
          </Text>
          <FlatList
            data={state.likedRestaurants}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.row}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
      {/* Privacy Policy link */}
      <Pressable
        onPress={handlePrivacy}
        style={({ pressed }) => [styles.privacyLink, pressed && { opacity: 0.5 }]}
      >
        <Text style={[styles.privacyText, { color: colors.muted }]}>Privacy Policy</Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
  },
  headerSub: {
    fontSize: 12,
    fontWeight: "500",
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  countText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  hintText: {
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 8,
  },
  grid: {
    padding: 16,
    paddingBottom: 32,
  },
  row: {
    gap: 16,
    marginBottom: 16,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  cardOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "50%",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  cardInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
  },
  cardName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 18,
  },
  cardCuisine: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
    marginTop: 2,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 4,
  },
  cardStar: {
    color: "#FFD60A",
    fontSize: 11,
  },
  cardRating: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  cardDot: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
  },
  cardPrice: {
    color: "#FFD60A",
    fontSize: 11,
    fontWeight: "600",
  },
  openDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  discoverButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 8,
  },
  discoverButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  privacyLink: {
    alignItems: "center",
    paddingVertical: 12,
  },
  privacyText: {
    fontSize: 12,
    textDecorationLine: "underline",
  },
});
