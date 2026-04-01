import React, { useCallback, useRef, useState, useMemo } from "react";
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
  Modal,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useSwipe } from "@/lib/swipe-context";
import { useColors } from "@/hooks/use-colors";
import { useLanguage } from "@/hooks/use-language";
import { trpc } from "@/lib/trpc";
import { RestaurantShareCard, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from "@/components/restaurant-share-card";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function RestaurantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state, swipeRight, swipeLeft, unlike } = useSwipe();
  const colors = useColors();
  const { t, currentLanguage } = useLanguage();
  const insets = useSafeAreaInsets();

  const restaurant = state.allRestaurants.find((r) => r.id === id)
    ?? state.likedRestaurants.find((r) => r.id === id);
  const isLiked = state.likedRestaurants.some((r) => r.id === id);

  const shareCardRef = useRef<View>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const heroPhotos = restaurant?.photos?.length ? restaurant.photos : restaurant ? [restaurant.imageUrl] : [];
  const [photoIndex, setPhotoIndex] = useState(0);

  const { data: details, isLoading: isLoadingDetails, isError: isDetailsError } = trpc.places.restaurantDetails.useQuery(
    { placeId: id! },
    { enabled: !!id }
  );

  // Grid photos: use detail API photos (authoritative), fall back to hero photos minus first
  const gridPhotos = useMemo(() => {
    if (details?.photos?.length) return details.photos;
    return heroPhotos.slice(1);
  }, [details?.photos, restaurant?.id]);

  // Translate cuisine names - MOVE THIS EARLY
  const translatedCuisines = useMemo(() => {
    if (!restaurant) return [];
    return restaurant.cuisine.map((c) => {
      const key = c.toLowerCase().replace(/\s+/g, '');
      return t(`cuisines.${key}`) || c;
    });
  }, [restaurant?.cuisine, t]);

  // Translate hours (day names and AM/PM)
  const translatedHours = useMemo(() => {
    if (!details?.weekdayText) return null;
    
    const dayMap: Record<string, string> = {
      Monday: t('days.monday'),
      Tuesday: t('days.tuesday'),
      Wednesday: t('days.wednesday'),
      Thursday: t('days.thursday'),
      Friday: t('days.friday'),
      Saturday: t('days.saturday'),
      Sunday: t('days.sunday'),
    };

    return details.weekdayText.map((line) => {
      let translated = line;
      // Replace day names
      Object.entries(dayMap).forEach(([eng, local]) => {
        translated = translated.replace(new RegExp(`^${eng}:`, 'i'), `${local}:`);
      });
      // Replace AM/PM
      translated = translated.replace(/\bAM\b/g, t('time.am'));
      translated = translated.replace(/\bPM\b/g, t('time.pm'));
      return translated;
    });
  }, [details?.weekdayText, t]);

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

  const handleShare = useCallback(() => {
    setShowShareModal(true);
  }, []);

  const handleShareImage = useCallback(async () => {
    if (!restaurant || !shareCardRef.current) return;
    setIsCapturing(true);
    try {
      const uri = await captureRef(shareCardRef, {
        format: "png",
        quality: 1,
        result: Platform.OS === "web" ? "data-uri" : "tmpfile",
      });

      if (Platform.OS === "web") {
        if (typeof navigator !== "undefined" && navigator.share) {
          const res = await fetch(uri);
          const blob = await res.blob();
          const file = new File([blob], `${restaurant.name}.png`, { type: "image/png" });
          await navigator.share({ files: [file], title: restaurant.name });
        } else {
          const a = document.createElement("a");
          a.href = uri;
          a.download = `${restaurant.name}.png`;
          a.click();
        }
      } else {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: `Share ${restaurant.name}` });
        }
      }
    } catch {
      // Fallback to text share
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name)}&query_place_id=${restaurant.id}`;
      await Share.share({ title: restaurant.name, message: `${restaurant.name}\n${restaurant.address}\n${mapsUrl}` });
    } finally {
      setIsCapturing(false);
      setShowShareModal(false);
    }
  }, [restaurant]);

  const handleShareLink = useCallback(async () => {
    if (!restaurant) return;
    const displayName = restaurant.nameLocalized?.[currentLanguage] || restaurant.name;
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name)}&query_place_id=${restaurant.id}`;
    await Share.share({
      title: displayName,
      message: `${displayName}\n${translatedCuisines.join(" · ")} · ${"$".repeat(restaurant.priceLevel)}\n⭐ ${restaurant.rating}/5 · ${restaurant.distance.toFixed(1)}km ${t('restaurant.away')}\n${restaurant.address}\n\n${mapsUrl}`,
    });
    setShowShareModal(false);
  }, [restaurant, translatedCuisines, t, currentLanguage]);

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
  const priceLabelMap = ["", "budget", "moderateLabel", "upscale", "fineDining"];
  const priceLabel = t(`priceLevel.${priceLabelMap[restaurant.priceLevel]}`);

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
            {restaurant?.nameLocalized?.[currentLanguage] || restaurant?.name}
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
          {restaurant.cuisine.map((c) => {
            const key = c.toLowerCase().replace(/\s+/g, '');
            const translatedCuisine = t(`cuisines.${key}`) || c;
            return (
              <View key={c} style={[styles.tag, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.tagText, { color: colors.foreground }]}>{translatedCuisine}</Text>
              </View>
            );
          })}
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
              <Text style={[styles.infoLabel, { color: colors.muted }]}>{t('restaurant.address')}</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>{restaurant.address}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: colors.surface }]}>
              <IconSymbol name="location.fill" size={18} color={colors.primary} />
            </View>
            <View style={styles.infoText}>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>{t('restaurant.distance')}</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {restaurant.distance.toFixed(1)} km {t('restaurant.away')}
              </Text>
            </View>
          </View>

          {/* Full weekly hours */}
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: colors.surface }]}>
              <IconSymbol name="clock.fill" size={18} color={colors.primary} />
            </View>
            <View style={styles.infoText}>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>{t('restaurant.hours')}</Text>
              {isLoadingDetails ? (
                <ActivityIndicator size="small" color={colors.muted} style={{ alignSelf: "flex-start", marginTop: 4 }} />
              ) : translatedHours ? (
                translatedHours.map((line, i) => (
                  <Text key={i} style={[styles.infoValue, { color: colors.foreground, fontWeight: "400" }]}>
                    {line}
                  </Text>
                ))
              ) : (
                <Text style={[styles.infoValue, { color: colors.foreground }]}>
                  {restaurant.isOpen ? t('deck.openNow') : t('deck.closed')}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Photos Grid */}
        {gridPhotos.length > 0 && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.photosSection}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('deck.photos')}</Text>
              <View style={styles.photoGrid}>
                {gridPhotos.map((uri, i) => (
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
        {!isDetailsError && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.reviewsSection}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('restaurant.reviews')}</Text>

              {isLoadingDetails ? (
                <ActivityIndicator color={colors.muted} style={{ marginTop: 12 }} />
              ) : details?.reviews?.length ? (
                details.reviews.map((review, i) => (
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
              ) : (
                <Text style={[styles.reviewText, { color: colors.muted, marginTop: 8 }]}>
                  No reviews available.
                </Text>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Share Modal */}
      <Modal
        visible={showShareModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowShareModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowShareModal(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.surface }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Share Restaurant</Text>

            {/* Card preview */}
            {restaurant && (
              <View style={styles.cardPreviewWrapper}>
                <RestaurantShareCard ref={shareCardRef} restaurant={restaurant} />
              </View>
            )}

            {/* Actions */}
            <View style={styles.shareActions}>
              <Pressable
                onPress={handleShareImage}
                disabled={isCapturing}
                style={({ pressed }) => [
                  styles.shareBtn,
                  { backgroundColor: colors.primary },
                  pressed && { opacity: 0.8 },
                  isCapturing && { opacity: 0.6 },
                ]}
              >
                <IconSymbol name="photo" size={18} color="#fff" />
                <Text style={styles.shareBtnText}>
                  {isCapturing ? "Preparing…" : "Share Image"}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleShareLink}
                style={({ pressed }) => [
                  styles.shareBtn,
                  { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <IconSymbol name="link" size={18} color={colors.foreground} />
                <Text style={[styles.shareBtnText, { color: colors.foreground }]}>Share Link</Text>
              </Pressable>
            </View>

            <Pressable onPress={() => setShowShareModal(false)} style={styles.cancelBtn}>
              <Text style={[styles.cancelText, { color: colors.muted }]}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 32,
    gap: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  cardPreviewWrapper: {
    alignItems: "center",
    borderRadius: 24,
    overflow: "hidden",
    // Scale down to fit the modal width nicely
    transform: [{ scale: (SCREEN_WIDTH - 48) / SHARE_CARD_WIDTH }],
    // Compensate for scale to avoid extra whitespace
    marginVertical: -((SHARE_CARD_HEIGHT * (1 - (SCREEN_WIDTH - 48) / SHARE_CARD_WIDTH)) / 2),
  },
  shareActions: {
    gap: 10,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  shareBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
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
  passBtn: { backgroundColor: "transparent", borderWidth: 2, borderColor: "#FF3B30" },
  likeBtn: { backgroundColor: "#FF4B4B" },
  passIcon: { fontSize: 18, color: "#FF3B30", fontWeight: "700" },
  passLabel: { fontSize: 16, color: "#FF3B30", fontWeight: "700" },
  likeIcon: { fontSize: 18, color: "#fff", fontWeight: "700" },
  likeLabel: { fontSize: 16, color: "#fff", fontWeight: "700" },
});
