import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  Platform,
  Share,
  Linking,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useSwipe } from "@/lib/swipe-context";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function RestaurantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state, swipeRight, swipeLeft, unlike } = useSwipe();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const restaurant = state.allRestaurants.find((r) => r.id === id)
    ?? state.likedRestaurants.find((r) => r.id === id);
  const isLiked = state.likedRestaurants.some((r) => r.id === id);

  const heroPhotos = restaurant?.photos?.length ? restaurant.photos : restaurant ? [restaurant.imageUrl] : [];
  const [photoIndex, setPhotoIndex] = useState(0);

  const { data: details, isLoading: isLoadingDetails } = trpc.places.restaurantDetails.useQuery(
    { placeId: id! },
    { enabled: !!id }
  );

  // Merge hero photos + detail photos, deduplicate by URL
  const allPhotos = details?.photos?.length
    ? [...new Set([...heroPhotos, ...details.photos])]
    : heroPhotos;

  const handlePhotoScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setPhotoIndex(index);
  }, []);

  const handleLike = useCallback(() => {
    if (!restaurant) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isLiked) {
      unlike(restaurant.id);
    } else {
      swipeRight(restaurant);
    }
  }, [restaurant, isLiked, swipeRight, unlike]);

  const handleShare = useCallback(async () => {
    if (!restaurant) return;
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name)}&query_place_id=${restaurant.id}`;
    const priceString = "$".repeat(restaurant.priceLevel);
    try {
      await Share.share({
        title: restaurant.name,
        message: `${restaurant.name}\n${restaurant.cuisine.join(" · ")} · ${priceString}\nRating: ${restaurant.rating}/5 · ${restaurant.distance.toFixed(1)}km away\n${restaurant.address}\n\n${mapsUrl}`,
      });
    } catch {}
  }, [restaurant]);

  const handleDirections = useCallback(() => {
    if (!restaurant) return;
    const url = Platform.select({
      ios: `maps://maps.apple.com/?daddr=${restaurant.lat},${restaurant.lng}&q=${encodeURIComponent(restaurant.name)}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${restaurant.lat},${restaurant.lng}&destination_place_id=${restaurant.id}`,
    });
    Linking.openURL(url);
  }, [restaurant]);

  const handleCall = useCallback(() => {
    if (!details?.phone) return;
    Linking.openURL(`tel:${details.phone}`);
  }, [details?.phone]);

  const handleWebsite = useCallback(() => {
    if (!details?.website) return;
    Linking.openURL(details.website);
  }, [details?.website]);

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
      {/* Hero Image Gallery */}
      <View style={styles.heroContainer}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handlePhotoScroll}
          scrollEventThrottle={16}
          style={{ width: SCREEN_WIDTH, height: "100%" }}
        >
          {heroPhotos.map((uri, i) => (
            <Image
              key={i}
              source={{ uri }}
              style={[styles.heroImage, { width: SCREEN_WIDTH }]}
              contentFit="cover"
            />
          ))}
        </ScrollView>

        {/* Photo dots */}
        {heroPhotos.length > 1 && (
          <View style={styles.heroDots}>
            {heroPhotos.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.heroDot,
                  { backgroundColor: i === photoIndex ? "#fff" : "rgba(255,255,255,0.45)" },
                  i === photoIndex && { width: 16 },
                ]}
              />
            ))}
          </View>
        )}

        {/* Close button */}
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.closeButton, { top: insets.top + 12 }, pressed && { opacity: 0.7 }]}
        >
          <IconSymbol name="xmark" size={18} color="#fff" />
        </Pressable>

        {/* Share button */}
        <Pressable
          onPress={handleShare}
          style={({ pressed }) => [styles.shareButton, { top: insets.top + 12 }, pressed && { opacity: 0.7 }]}
        >
          <IconSymbol name="square.and.arrow.up" size={18} color="#fff" />
        </Pressable>

        {/* Open/Closed badge */}
        <View style={[styles.openBadge, { backgroundColor: restaurant.isOpen ? "#34C759" : "#FF3B30" }]}>
          <Text style={styles.openBadgeText}>{restaurant.isOpen ? "● Open Now" : "● Closed"}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentInner, { paddingBottom: insets.bottom + 100 }]}
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
          <Text style={[styles.rating, { color: colors.foreground }]}>{restaurant.rating.toFixed(1)}</Text>
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

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Quick Actions: Directions · Call · Website */}
        <View style={styles.quickActions}>
          <Pressable
            onPress={handleDirections}
            style={({ pressed }) => [styles.quickBtn, { backgroundColor: colors.primary }, pressed && { opacity: 0.8 }]}
          >
            <IconSymbol name="location.fill" size={18} color="#fff" />
            <Text style={styles.quickBtnText}>Directions</Text>
          </Pressable>

          <Pressable
            onPress={handleCall}
            disabled={!details?.phone}
            style={({ pressed }) => [
              styles.quickBtn,
              { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
              pressed && { opacity: 0.7 },
              !details?.phone && { opacity: 0.4 },
            ]}
          >
            <IconSymbol name="phone.fill" size={18} color={colors.foreground} />
            <Text style={[styles.quickBtnText, { color: colors.foreground }]}>
              {isLoadingDetails ? "..." : details?.phone ? "Call" : "No phone"}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleWebsite}
            disabled={!details?.website}
            style={({ pressed }) => [
              styles.quickBtn,
              { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
              pressed && { opacity: 0.7 },
              !details?.website && { opacity: 0.4 },
            ]}
          >
            <IconSymbol name="globe" size={18} color={colors.foreground} />
            <Text style={[styles.quickBtnText, { color: colors.foreground }]}>
              {isLoadingDetails ? "..." : details?.website ? "Website" : "No site"}
            </Text>
          </Pressable>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Info Rows */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: colors.surface }]}>
              <IconSymbol name="mappin.and.ellipse" size={18} color={colors.primary} />
            </View>
            <View style={styles.infoText}>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>Address</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>{restaurant.address}</Text>
            </View>
          </View>

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

          {/* Full weekly hours */}
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: colors.surface }]}>
              <IconSymbol name="clock.fill" size={18} color={colors.primary} />
            </View>
            <View style={styles.infoText}>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>Hours</Text>
              {isLoadingDetails ? (
                <ActivityIndicator size="small" color={colors.muted} style={{ alignSelf: "flex-start", marginTop: 4 }} />
              ) : details?.weekdayText ? (
                details.weekdayText.map((line, i) => (
                  <Text key={i} style={[styles.infoValue, { color: colors.foreground, fontWeight: "400" }]}>
                    {line}
                  </Text>
                ))
              ) : (
                <Text style={[styles.infoValue, { color: colors.foreground }]}>
                  {restaurant.isOpen ? "Open now" : "Closed"}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Photos Grid */}
        {allPhotos.length > 1 && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.photosSection}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Photos</Text>
              <View style={styles.photoGrid}>
                {allPhotos.slice(1).map((uri, i) => (
                  <Image
                    key={i}
                    source={{ uri }}
                    style={styles.photoThumb}
                    contentFit="cover"
                    transition={200}
                  />
                ))}
              </View>
            </View>
          </>
        )}

        {/* Reviews */}
        {(isLoadingDetails || (details?.reviews && details.reviews.length > 0)) && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.reviewsSection}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Reviews</Text>

              {isLoadingDetails ? (
                <ActivityIndicator color={colors.muted} style={{ marginTop: 12 }} />
              ) : (
                details?.reviews?.map((review, i) => (
                  <View key={i} style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.reviewHeader}>
                      <View style={[styles.reviewAvatar, { backgroundColor: colors.primary }]}>
                        <Text style={styles.reviewAvatarText}>
                          {review.author.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.reviewMeta}>
                        <Text style={[styles.reviewAuthor, { color: colors.foreground }]} numberOfLines={1}>
                          {review.author}
                        </Text>
                        <Text style={[styles.reviewTime, { color: colors.muted }]}>{review.time}</Text>
                      </View>
                      <View style={styles.reviewStars}>
                        {Array.from({ length: 5 }).map((_, s) => (
                          <Text key={s} style={{ color: s < review.rating ? "#FFD60A" : colors.border, fontSize: 12 }}>
                            ★
                          </Text>
                        ))}
                      </View>
                    </View>
                    {review.text ? (
                      <Text style={[styles.reviewText, { color: colors.muted }]} numberOfLines={4}>
                        {review.text}
                      </Text>
                    ) : null}
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View
        style={[
          styles.actionBar,
          { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: insets.bottom + 12 },
        ]}
      >
        <Pressable
          onPress={() => { router.back(); setTimeout(() => swipeLeft(), 100); }}
          style={({ pressed }) => [styles.actionBtn, styles.passBtn, pressed && { transform: [{ scale: 0.94 }] }]}
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
  container: { flex: 1 },
  heroContainer: {
    width: "100%",
    height: SCREEN_HEIGHT * 0.42,
    position: "relative",
  },
  heroImage: { height: "100%" },
  heroDots: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  heroDot: { width: 6, height: 6, borderRadius: 3 },
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
  openBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  content: { flex: 1 },
  contentInner: { padding: 20 },
  nameRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
  },
  name: { fontSize: 26, fontWeight: "800", flex: 1, lineHeight: 32 },
  price: { fontSize: 18, fontWeight: "700", paddingTop: 4 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 12 },
  star: { color: "#FFD60A", fontSize: 16 },
  rating: { fontSize: 16, fontWeight: "700" },
  reviewCount: { fontSize: 14 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  tag: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  tagText: { fontSize: 13, fontWeight: "600" },
  divider: { height: 1, marginVertical: 16 },
  quickActions: { flexDirection: "row", gap: 10 },
  quickBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
  },
  quickBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  infoSection: { gap: 16 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  infoIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  infoText: { flex: 1, justifyContent: "center" },
  infoLabel: { fontSize: 12, fontWeight: "500", marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: "600", lineHeight: 20 },
  photosSection: { gap: 12 },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  photoThumb: {
    width: (SCREEN_WIDTH - 48) / 2,
    height: (SCREEN_WIDTH - 48) / 2,
    borderRadius: 12,
  },
  reviewsSection: { gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  reviewCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  reviewHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewAvatarText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  reviewMeta: { flex: 1 },
  reviewAuthor: { fontSize: 14, fontWeight: "700" },
  reviewTime: { fontSize: 12, marginTop: 1 },
  reviewStars: { flexDirection: "row", gap: 1 },
  reviewText: { fontSize: 14, lineHeight: 20 },
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
  passBtn: { backgroundColor: "transparent", borderWidth: 2, borderColor: "#FF3B30" },
  likeBtn: { backgroundColor: "#FF4B4B" },
  passIcon: { fontSize: 18, color: "#FF3B30", fontWeight: "700" },
  passLabel: { fontSize: 16, color: "#FF3B30", fontWeight: "700" },
  likeIcon: { fontSize: 18, color: "#fff", fontWeight: "700" },
  likeLabel: { fontSize: 16, color: "#fff", fontWeight: "700" },
});
