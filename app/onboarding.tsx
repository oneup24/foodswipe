import React, { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ONBOARDING_KEY = "@foodswipe_onboarded";

const SLIDES = [
  {
    emoji: "🍽️",
    title: "Welcome to FoodSwipe",
    subtitle: "Discover your next favourite restaurant, one swipe at a time.",
    accent: "#FF4B4B",
  },
  {
    emoji: "👉",
    title: "Swipe Right to Like",
    subtitle: "Hungry? Swipe right or tap the heart to save a restaurant to your list.",
    accent: "#34C759",
    demo: "like",
  },
  {
    emoji: "⭐",
    title: "Super Like & Pass",
    subtitle: "Swipe up (or tap ★) to super like your top picks. Swipe left to pass.",
    accent: "#007AFF",
    demo: "superlike",
  },
  {
    emoji: "📍",
    title: "Tap for Full Details",
    subtitle: "See hours, reviews, call ahead, get directions, and share with friends.",
    accent: "#FF9500",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentIndex(index);
  }, []);

  const goNext = useCallback(() => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    const nextIndex = currentIndex + 1;
    if (nextIndex < SLIDES.length) {
      scrollRef.current?.scrollTo({ x: SCREEN_WIDTH * nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    }
  }, [currentIndex]);

  const finish = useCallback(async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await AsyncStorage.setItem(ONBOARDING_KEY, "1");
    router.replace("/(tabs)");
  }, [router]);

  const skip = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "1");
    router.replace("/(tabs)");
  }, [router]);

  const isLast = currentIndex === SLIDES.length - 1;
  const slide = SLIDES[currentIndex];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Skip button */}
      {!isLast && (
        <Pressable
          onPress={skip}
          style={[styles.skipBtn, { top: insets.top + 16 }]}
          hitSlop={12}
        >
          <Text style={[styles.skipText, { color: colors.muted }]}>Skip</Text>
        </Pressable>
      )}

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.scroll}
      >
        {SLIDES.map((s, i) => (
          <View key={i} style={[styles.slide, { width: SCREEN_WIDTH }]}>
            {/* Emoji illustration */}
            <View style={[styles.emojiContainer, { backgroundColor: s.accent + "18" }]}>
              <Text style={styles.emoji}>{s.emoji}</Text>

              {/* Demo gesture hints */}
              {s.demo === "like" && (
                <View style={styles.demoRow}>
                  <View style={[styles.demoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={styles.demoCardText}>Sushi Place</Text>
                  </View>
                  <View style={[styles.demoBadge, { backgroundColor: "#34C75922", borderColor: "#34C759" }]}>
                    <Text style={[styles.demoBadgeText, { color: "#34C759" }]}>LIKE</Text>
                  </View>
                </View>
              )}
              {s.demo === "superlike" && (
                <View style={styles.demoRow}>
                  <View style={[styles.demoCardUp, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={styles.demoCardText}>Italian Bistro</Text>
                  </View>
                  <View style={[styles.demoBadge, { backgroundColor: "#007AFF22", borderColor: "#007AFF" }]}>
                    <Text style={[styles.demoBadgeText, { color: "#007AFF" }]}>SUPER LIKE</Text>
                  </View>
                </View>
              )}
            </View>

            <Text style={[styles.title, { color: colors.foreground }]}>{s.title}</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>{s.subtitle}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Bottom controls */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === currentIndex ? slide.accent : colors.border,
                  width: i === currentIndex ? 20 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* Button */}
        <Pressable
          onPress={isLast ? finish : goNext}
          style={({ pressed }) => [
            styles.btn,
            { backgroundColor: slide.accent },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.btnText}>{isLast ? "Get Started" : "Next"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skipBtn: {
    position: "absolute",
    right: 20,
    zIndex: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  skipText: { fontSize: 15, fontWeight: "600" },
  scroll: { flex: 1 },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    gap: 24,
  },
  emojiContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emoji: { fontSize: 72 },
  demoRow: {
    position: "absolute",
    bottom: -12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  demoCard: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  demoCardUp: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  demoCardText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  demoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 2,
  },
  demoBadgeText: { fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  title: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  bottom: {
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 20,
    alignItems: "center",
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  btn: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
  },
  btnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
});
