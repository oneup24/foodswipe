import React, { useCallback, useRef, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Restaurant } from "@/lib/types";
import { useColors } from "@/hooks/use-colors";
import { useLanguage } from "@/hooks/use-language";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;
const SWIPE_UP_THRESHOLD = -SCREEN_HEIGHT * 0.2;
const CARD_WIDTH = SCREEN_WIDTH - 32;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.62;

type Props = {
  restaurant: Restaurant;
  onSwipeRight: (restaurant: Restaurant) => void;
  onSwipeLeft: () => void;
  onSwipeUp: (restaurant: Restaurant) => void;
  onPress: (restaurant: Restaurant) => void;
  isTop: boolean;
  index: number;
};

function triggerHaptic(type: "like" | "pass" | "super") {
  if (Platform.OS === "web") return;
  if (type === "like") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } else if (type === "super") {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } else {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

export function SwipeCard({
  restaurant,
  onSwipeRight,
  onSwipeLeft,
  onSwipeUp,
  onPress,
  isTop,
  index,
}: Props) {
  const colors = useColors();
  const { t, currentLanguage } = useLanguage();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(isTop ? 1 : 0.95 - index * 0.02);

  const shuffleArray = <T,>(arr: T[]): T[] => {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const photos = useMemo(
    () =>
      shuffleArray(
        restaurant.photos?.length ? restaurant.photos : [restaurant.imageUrl]
      ),
    [restaurant.id, restaurant.photos]
  );
  const [photoIndex, setPhotoIndex] = useState(0);
  const photoIndexRef = useRef(0);

  const goNextPhoto = useCallback(() => {
    const next = Math.min(photos.length - 1, photoIndexRef.current + 1);
    photoIndexRef.current = next;
    setPhotoIndex(next);
  }, [photos.length]);

  const goPrevPhoto = useCallback(() => {
    const prev = Math.max(0, photoIndexRef.current - 1);
    photoIndexRef.current = prev;
    setPhotoIndex(prev);
  }, []);

  const handleSwipeRight = useCallback(() => {
    triggerHaptic("like");
    onSwipeRight(restaurant);
  }, [onSwipeRight, restaurant]);

  const handleSwipeLeft = useCallback(() => {
    triggerHaptic("pass");
    onSwipeLeft();
  }, [onSwipeLeft]);

  const handleSwipeUp = useCallback(() => {
    triggerHaptic("super");
    onSwipeUp(restaurant);
  }, [onSwipeUp, restaurant]);

  const handlePress = useCallback(() => {
    onPress(restaurant);
  }, [onPress, restaurant]);

  const gesture = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-8, 8])
    .activeOffsetY([-8, 8])
    .onUpdate((event) => {
      if (!isTop) return;
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (!isTop) return;
      const { translationX, translationY, velocityX } = event;

      // Swipe up = super like
      if (translationY < SWIPE_UP_THRESHOLD && Math.abs(translationX) < 80) {
        translateY.value = withTiming(-SCREEN_HEIGHT, { duration: 300 });
        handleSwipeUp();
        return;
      }

      // Swipe right = like
      if (translationX > SWIPE_THRESHOLD || velocityX > 800) {
        translateX.value = withTiming(SCREEN_WIDTH * 1.5, { duration: 300 });
        handleSwipeRight();
        return;
      }

      // Swipe left = pass
      if (translationX < -SWIPE_THRESHOLD || velocityX < -800) {
        translateX.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: 300 });
        handleSwipeLeft();
        return;
      }

      // Snap back
      translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
      translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
    });

  const tapGesture = Gesture.Tap()
    .runOnJS(true)
    .maxDuration(200)
    .onEnd((event) => {
      if (!isTop) return;
      if (photos.length > 1) {
        if (event.x < CARD_WIDTH * 0.33) {
          goPrevPhoto();
          return;
        }
        if (event.x > CARD_WIDTH * 0.67) {
          goNextPhoto();
          return;
        }
      }
      handlePress();
    });

  const composedGesture = Gesture.Simultaneous(gesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      [-12, 0, 12],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
        { scale: scale.value },
      ],
    };
  });

  // Like overlay opacity
  const likeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));

  // Pass overlay opacity
  const passOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], Extrapolation.CLAMP),
  }));

  // Super like overlay opacity
  const superLikeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [SWIPE_UP_THRESHOLD, 0],
      [1, 0],
      Extrapolation.CLAMP
    ),
  }));

  // Ambient edge cues — subtle colored bars that hint at swipe direction
  const rightEdgeCue = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD * 0.4], [0, 0.65], Extrapolation.CLAMP),
  }));
  const leftEdgeCue = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD * 0.4, 0], [0.65, 0], Extrapolation.CLAMP),
  }));
  const topEdgeCue = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [SWIPE_UP_THRESHOLD * 0.4, 0], [0.65, 0], Extrapolation.CLAMP),
  }));

  const priceString = "$".repeat(restaurant.priceLevel);

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        accessible
        accessibilityLabel={restaurant.name}
        accessibilityHint="Swipe right to like, left to pass, up to super like"
        style={[
          styles.card,
          animatedStyle,
          {
            backgroundColor: colors.surface,
            shadowColor: colors.foreground,
            zIndex: 100 - index,
            top: index * 8,
          },
        ]}
      >
        {/* Hero Image */}
        <Image
          source={{ uri: photos[photoIndex] }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />

        {/* Carousel Arrows */}
        {photos.length > 1 && (
          <>
            {/* Left Arrow */}
            {photoIndex > 0 && (
              <View style={[styles.arrow, styles.arrowLeft]}>
                <Text style={styles.arrowText}>‹</Text>
              </View>
            )}
            {/* Right Arrow */}
            {photoIndex < photos.length - 1 && (
              <View style={[styles.arrow, styles.arrowRight]}>
                <Text style={styles.arrowText}>›</Text>
              </View>
            )}
          </>
        )}

        {/* Photo dots */}
        {photos.length > 1 && (
          <View style={styles.dotsRow}>
            {photos.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.photoDot,
                  { backgroundColor: i === photoIndex ? "#fff" : "rgba(255,255,255,0.45)" },
                  i === photoIndex && { width: 16 },
                ]}
              />
            ))}
          </View>
        )}

        {/* Gradient overlay at bottom */}
        <View style={styles.gradient} />

        {/* Ambient edge cues */}
        <Animated.View style={[styles.edgeCueRight, rightEdgeCue]} pointerEvents="none" />
        <Animated.View style={[styles.edgeCueLeft, leftEdgeCue]} pointerEvents="none" />
        <Animated.View style={[styles.edgeCueTop, topEdgeCue]} pointerEvents="none" />

        {/* Like overlay */}
        <Animated.View style={[styles.overlay, styles.likeOverlay, likeOpacity]}>
          <Text style={styles.likeText}>LIKE</Text>
        </Animated.View>

        {/* Pass overlay */}
        <Animated.View style={[styles.overlay, styles.passOverlay, passOpacity]}>
          <Text style={styles.passText}>PASS</Text>
        </Animated.View>

        {/* Super Like overlay */}
        <Animated.View style={[styles.overlay, styles.superLikeOverlay, superLikeOpacity]}>
          <Text style={styles.superLikeText}>SUPER LIKE</Text>
        </Animated.View>

        {/* Card Info */}
        <View style={styles.info}>
          {/* Open/Closed badge */}
          <View style={styles.topBadges}>
            <View
              style={[
                styles.openBadge,
                { backgroundColor: restaurant.isOpen ? "#34C759" : "#FF3B30" },
              ]}
            >
              <Text style={styles.openBadgeText}>
                {restaurant.isOpen ? t('deck.openNow') : t('deck.closed')}
              </Text>
            </View>
          </View>

          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {restaurant.nameLocalized?.[currentLanguage] || restaurant.name}
            </Text>
            <Text style={styles.price}>{priceString}</Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.cuisine}>
              {restaurant.cuisine
                .slice(0, 2)
                .map((c) => {
                  const key = c.toLowerCase().replace(/\s+/g, '');
                  return t(`cuisines.${key}`) || c;
                })
                .join(" · ") || t('restaurant.description')}
            </Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.distance}>{restaurant.distance.toFixed(1)} km</Text>
          </View>

          <View style={styles.ratingRow}>
            <Text style={styles.star}>★</Text>
            <Text style={styles.rating}>{restaurant.rating.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({restaurant.reviewCount.toLocaleString()})</Text>
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    alignSelf: "center",
  },
  image: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  gradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "55%",
    backgroundColor: "transparent",
    // Simulated gradient using multiple overlapping views
    backgroundImage: undefined,
  },
  dotsRow: {
    position: "absolute",
    top: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  photoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  overlay: {
    position: "absolute",
    top: 40,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 3,
  },
  likeOverlay: {
    left: 20,
    borderColor: "#34C759",
    transform: [{ rotate: "-15deg" }],
  },
  passOverlay: {
    right: 20,
    borderColor: "#FF3B30",
    transform: [{ rotate: "15deg" }],
  },
  superLikeOverlay: {
    alignSelf: "center",
    left: "30%",
    borderColor: "#007AFF",
  },
  edgeCueRight: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: 8,
    backgroundColor: "#FF4B4B",
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
  },
  edgeCueLeft: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: 8,
    backgroundColor: "#8E8E93",
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
  },
  edgeCueTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: "#007AFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  likeText: {
    color: "#34C759",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 2,
  },
  passText: {
    color: "#FF3B30",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 2,
  },
  superLikeText: {
    color: "#007AFF",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 2,
  },
  info: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 24,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  topBadges: {
    flexDirection: "row",
    marginBottom: 8,
  },
  openBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  openBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  name: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    flex: 1,
    marginRight: 8,
  },
  price: {
    color: "#FFD60A",
    fontSize: 16,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 6,
  },
  cuisine: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontWeight: "500",
  },
  dot: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
  },
  distance: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontWeight: "500",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
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
  reviewCount: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
  },
  arrow: {
    position: "absolute",
    top: "50%",
    transform: [{ translateY: -20 }],
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  arrowLeft: {
    left: 12,
  },
  arrowRight: {
    right: 12,
  },
  arrowText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
  },
});
