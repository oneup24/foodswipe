import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useSwipe } from "@/lib/swipe-context";
import { useColors } from "@/hooks/use-colors";
import { CuisineType, PriceLevel, FilterState } from "@/lib/types";

const ALL_CUISINES: CuisineType[] = [
  "Italian", "Japanese", "Chinese", "Mexican", "American",
  "Thai", "Indian", "French", "Mediterranean", "Korean",
  "Vietnamese", "Greek", "Spanish", "Middle Eastern", "Seafood",
  "Steakhouse", "Pizza", "Sushi", "Burgers", "Desserts",
];

const PRICE_OPTIONS: { level: PriceLevel; label: string; desc: string }[] = [
  { level: 1, label: "$", desc: "Budget" },
  { level: 2, label: "$$", desc: "Moderate" },
  { level: 3, label: "$$$", desc: "Upscale" },
  { level: 4, label: "$$$$", desc: "Fine Dining" },
];

const DISTANCE_OPTIONS = [1, 2, 5, 10, 20];
const RATING_OPTIONS = [0, 3, 3.5, 4, 4.5];

export default function FiltersScreen() {
  const { state, setFilters } = useSwipe();
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [localFilters, setLocalFilters] = useState<FilterState>({ ...state.filters });

  const toggleCuisine = useCallback((cuisine: CuisineType) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    setLocalFilters((prev) => ({
      ...prev,
      cuisines: prev.cuisines.includes(cuisine)
        ? prev.cuisines.filter((c) => c !== cuisine)
        : [...prev.cuisines, cuisine],
    }));
  }, []);

  const togglePrice = useCallback((level: PriceLevel) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    setLocalFilters((prev) => ({
      ...prev,
      priceRange: prev.priceRange.includes(level)
        ? prev.priceRange.filter((p) => p !== level)
        : [...prev.priceRange, level],
    }));
  }, []);

  const setDistance = useCallback((dist: number) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    setLocalFilters((prev) => ({ ...prev, maxDistance: dist }));
  }, []);

  const setRating = useCallback((rating: number) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    setLocalFilters((prev) => ({ ...prev, minRating: rating }));
  }, []);

  const toggleOpenNow = useCallback(() => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    setLocalFilters((prev) => ({ ...prev, openNow: !prev.openNow }));
  }, []);

  const handleApply = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFilters(localFilters);
    router.back();
  }, [localFilters, setFilters, router]);

  const handleReset = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const reset: FilterState = {
      cuisines: [],
      priceRange: [],
      maxDistance: 2,
      minRating: 0,
      openNow: false,
    };
    setLocalFilters(reset);
  }, []);

  const activeCount =
    localFilters.cuisines.length +
    localFilters.priceRange.length +
    (localFilters.openNow ? 1 : 0) +
    (localFilters.minRating > 0 ? 1 : 0) +
    (localFilters.maxDistance < 10 ? 1 : 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { borderBottomColor: colors.border, paddingTop: insets.top + 16 },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [pressed && { opacity: 0.6 }]}
        >
          <IconSymbol name="xmark" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Filters
          {activeCount > 0 && (
            <Text style={{ color: colors.primary }}> ({activeCount})</Text>
          )}
        </Text>
        <Pressable
          onPress={handleReset}
          style={({ pressed }) => [pressed && { opacity: 0.6 }]}
        >
          <Text style={[styles.resetText, { color: colors.primary }]}>Reset</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Open Now */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Availability</Text>
          <Pressable
            onPress={toggleOpenNow}
            style={({ pressed }) => [
              styles.toggleRow,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && { opacity: 0.8 },
            ]}
          >
            <View>
              <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Open Now</Text>
              <Text style={[styles.toggleSubLabel, { color: colors.muted }]}>
                Only show currently open restaurants
              </Text>
            </View>
            <View
              style={[
                styles.toggle,
                {
                  backgroundColor: localFilters.openNow ? colors.primary : colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.toggleThumb,
                  {
                    transform: [{ translateX: localFilters.openNow ? 20 : 2 }],
                  },
                ]}
              />
            </View>
          </Pressable>
        </View>

        {/* Distance */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Max Distance
          </Text>
          <View style={styles.chipRow}>
            {DISTANCE_OPTIONS.map((dist) => {
              const active = localFilters.maxDistance === dist;
              return (
                <Pressable
                  key={dist}
                  onPress={() => setDistance(dist)}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      backgroundColor: active ? colors.primary : colors.surface,
                      borderColor: active ? colors.primary : colors.border,
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? "#fff" : colors.foreground },
                    ]}
                  >
                    {dist} km
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Price Range */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Price Range</Text>
          <View style={styles.chipRow}>
            {PRICE_OPTIONS.map(({ level, label, desc }) => {
              const active = localFilters.priceRange.includes(level);
              return (
                <Pressable
                  key={level}
                  onPress={() => togglePrice(level)}
                  style={({ pressed }) => [
                    styles.priceChip,
                    {
                      backgroundColor: active ? colors.primary : colors.surface,
                      borderColor: active ? colors.primary : colors.border,
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text
                    style={[
                      styles.priceLabel,
                      { color: active ? "#fff" : colors.foreground },
                    ]}
                  >
                    {label}
                  </Text>
                  <Text
                    style={[
                      styles.priceDesc,
                      { color: active ? "rgba(255,255,255,0.8)" : colors.muted },
                    ]}
                  >
                    {desc}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Minimum Rating */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Minimum Rating
          </Text>
          <View style={styles.chipRow}>
            {RATING_OPTIONS.map((rating) => {
              const active = localFilters.minRating === rating;
              return (
                <Pressable
                  key={rating}
                  onPress={() => setRating(rating)}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      backgroundColor: active ? colors.primary : colors.surface,
                      borderColor: active ? colors.primary : colors.border,
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? "#fff" : colors.foreground },
                    ]}
                  >
                    {rating === 0 ? "Any" : `★ ${rating}+`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Cuisine Types */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Cuisine Type
          </Text>
          <View style={styles.cuisineGrid}>
            {ALL_CUISINES.map((cuisine) => {
              const active = localFilters.cuisines.includes(cuisine);
              return (
                <Pressable
                  key={cuisine}
                  onPress={() => toggleCuisine(cuisine)}
                  style={({ pressed }) => [
                    styles.cuisineChip,
                    {
                      backgroundColor: active ? colors.primary : colors.surface,
                      borderColor: active ? colors.primary : colors.border,
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text
                    style={[
                      styles.cuisineText,
                      { color: active ? "#fff" : colors.foreground },
                    ]}
                  >
                    {cuisine}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Apply Button */}
      <View
        style={[
          styles.applyBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + 12,
          },
        ]}
      >
        <Pressable
          onPress={handleApply}
          style={({ pressed }) => [
            styles.applyButton,
            { backgroundColor: colors.primary },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.applyText}>
            Apply Filters{activeCount > 0 ? ` (${activeCount})` : ""}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  resetText: {
    fontSize: 16,
    fontWeight: "600",
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, gap: 8 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  toggleLabel: { fontSize: 15, fontWeight: "600" },
  toggleSubLabel: { fontSize: 12, marginTop: 2 },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  priceChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    minWidth: 72,
  },
  priceLabel: {
    fontSize: 16,
    fontWeight: "800",
  },
  priceDesc: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
  },
  cuisineGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  cuisineChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  cuisineText: {
    fontSize: 13,
    fontWeight: "600",
  },
  applyBar: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 0.5,
  },
  applyButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  applyText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
});
