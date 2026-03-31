import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  SectionList,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useSwipe } from "@/lib/swipe-context";
import { useColors } from "@/hooks/use-colors";
import { LocationState } from "@/lib/types";
import { trpc } from "@/lib/trpc";

const RECENT_KEY = "@foodswipe_recent_locations";
const MAX_RECENT = 5;

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Regional "Near You" suggestions ────────────────────────────────────────
function getRegionalSuggestions(lat: number, lng: number): LocationState[] {
  // Hong Kong
  if (lat >= 22.1 && lat <= 22.6 && lng >= 113.8 && lng <= 114.5)
    return [
      { lat: 22.3193, lng: 114.1736, cityName: "Mong Kok, Hong Kong" },
      { lat: 22.2793, lng: 114.1747, cityName: "Causeway Bay, Hong Kong" },
      { lat: 22.2797, lng: 114.1578, cityName: "Wan Chai, Hong Kong" },
      { lat: 22.2826, lng: 114.1543, cityName: "Central, Hong Kong" },
      { lat: 22.2795, lng: 114.2246, cityName: "Shau Kei Wan, Hong Kong" },
    ];

  // Tokyo
  if (lat >= 35.5 && lat <= 35.9 && lng >= 139.4 && lng <= 139.9)
    return [
      { lat: 35.6580, lng: 139.7016, cityName: "Shibuya, Tokyo" },
      { lat: 35.6938, lng: 139.7034, cityName: "Shinjuku, Tokyo" },
      { lat: 35.6717, lng: 139.7647, cityName: "Ginza, Tokyo" },
      { lat: 35.7123, lng: 139.7770, cityName: "Asakusa, Tokyo" },
      { lat: 35.6280, lng: 139.7366, cityName: "Shimokitazawa, Tokyo" },
    ];

  // Osaka
  if (lat >= 34.5 && lat <= 34.8 && lng >= 135.3 && lng <= 135.7)
    return [
      { lat: 34.6687, lng: 135.4995, cityName: "Dotonbori, Osaka" },
      { lat: 34.6721, lng: 135.5027, cityName: "Namba, Osaka" },
      { lat: 34.6937, lng: 135.5022, cityName: "Umeda, Osaka" },
      { lat: 34.6552, lng: 135.5119, cityName: "Shinsekai, Osaka" },
      { lat: 34.6760, lng: 135.5194, cityName: "Namba Parks, Osaka" },
    ];

  // Seoul
  if (lat >= 37.4 && lat <= 37.7 && lng >= 126.8 && lng <= 127.2)
    return [
      { lat: 37.5563, lng: 126.9239, cityName: "Hongdae, Seoul" },
      { lat: 37.5635, lng: 126.9831, cityName: "Myeongdong, Seoul" },
      { lat: 37.5172, lng: 127.0473, cityName: "Gangnam, Seoul" },
      { lat: 37.5709, lng: 127.0086, cityName: "Dongdaemun, Seoul" },
      { lat: 37.5800, lng: 126.9844, cityName: "Insadong, Seoul" },
    ];

  // Taipei
  if (lat >= 24.9 && lat <= 25.2 && lng >= 121.4 && lng <= 121.7)
    return [
      { lat: 25.0478, lng: 121.5319, cityName: "Xinyi, Taipei" },
      { lat: 25.0420, lng: 121.5340, cityName: "Ximending, Taipei" },
      { lat: 25.0607, lng: 121.5241, cityName: "Zhongshan, Taipei" },
      { lat: 25.0330, lng: 121.5654, cityName: "Raohe Night Market, Taipei" },
      { lat: 25.0284, lng: 121.5194, cityName: "Gongguan, Taipei" },
    ];

  // Singapore
  if (lat >= 1.1 && lat <= 1.5 && lng >= 103.6 && lng <= 104.1)
    return [
      { lat: 1.2966, lng: 103.8536, cityName: "Chinatown, Singapore" },
      { lat: 1.3027, lng: 103.8318, cityName: "Orchard Road, Singapore" },
      { lat: 1.2893, lng: 103.8519, cityName: "Clarke Quay, Singapore" },
      { lat: 1.3058, lng: 103.8323, cityName: "Little India, Singapore" },
      { lat: 1.3048, lng: 103.8318, cityName: "Arab Street, Singapore" },
    ];

  // Bangkok
  if (lat >= 13.5 && lat <= 14.0 && lng >= 100.4 && lng <= 100.8)
    return [
      { lat: 13.7563, lng: 100.5018, cityName: "Sukhumvit, Bangkok" },
      { lat: 13.7461, lng: 100.5151, cityName: "Silom, Bangkok" },
      { lat: 13.7398, lng: 100.5127, cityName: "Chinatown (Yaowarat), Bangkok" },
      { lat: 13.7308, lng: 100.5412, cityName: "Thonglor, Bangkok" },
      { lat: 13.7568, lng: 100.5021, cityName: "Khaosan Road, Bangkok" },
    ];

  // London
  if (lat >= 51.3 && lat <= 51.7 && lng >= -0.5 && lng <= 0.3)
    return [
      { lat: 51.5142, lng: -0.0755, cityName: "Shoreditch, London" },
      { lat: 51.5116, lng: -0.1198, cityName: "Soho, London" },
      { lat: 51.5099, lng: -0.1337, cityName: "Covent Garden, London" },
      { lat: 51.5209, lng: -0.0862, cityName: "Brick Lane, London" },
      { lat: 51.4957, lng: -0.1761, cityName: "Chelsea, London" },
    ];

  // Paris
  if (lat >= 48.7 && lat <= 49.0 && lng >= 2.2 && lng <= 2.5)
    return [
      { lat: 48.8637, lng: 2.3279, cityName: "Le Marais, Paris" },
      { lat: 48.8530, lng: 2.3499, cityName: "Latin Quarter, Paris" },
      { lat: 48.8842, lng: 2.3338, cityName: "Montmartre, Paris" },
      { lat: 48.8495, lng: 2.3456, cityName: "Saint-Germain-des-Prés, Paris" },
      { lat: 48.8756, lng: 2.3492, cityName: "Canal Saint-Martin, Paris" },
    ];

  // New York
  if (lat >= 40.5 && lat <= 40.9 && lng >= -74.1 && lng <= -73.7)
    return [
      { lat: 40.7580, lng: -73.9855, cityName: "Midtown, New York" },
      { lat: 40.7282, lng: -74.0060, cityName: "Lower Manhattan, New York" },
      { lat: 40.7282, lng: -73.9949, cityName: "East Village, New York" },
      { lat: 40.7282, lng: -73.7949, cityName: "Flushing, Queens, New York" },
      { lat: 40.7282, lng: -73.9442, cityName: "Williamsburg, Brooklyn" },
    ];

  return [];
}

// ─── Popular Worldwide (curated global food destinations) ────────────────────
const POPULAR_WORLDWIDE: (LocationState & { flag: string })[] = [
  { lat: 22.3193, lng: 114.1694, cityName: "Hong Kong", flag: "🇭🇰" },
  { lat: 35.6762, lng: 139.6503, cityName: "Tokyo, Japan", flag: "🇯🇵" },
  { lat: 34.6937, lng: 135.5022, cityName: "Osaka, Japan", flag: "🇯🇵" },
  { lat: 1.3521, lng: 103.8198, cityName: "Singapore", flag: "🇸🇬" },
  { lat: 37.5665, lng: 126.9780, cityName: "Seoul, South Korea", flag: "🇰🇷" },
  { lat: 25.0330, lng: 121.5654, cityName: "Taipei, Taiwan", flag: "🇹🇼" },
  { lat: 13.7563, lng: 100.5018, cityName: "Bangkok, Thailand", flag: "🇹🇭" },
  { lat: 10.8231, lng: 106.6297, cityName: "Ho Chi Minh City, Vietnam", flag: "🇻🇳" },
  { lat: 21.0285, lng: 105.8542, cityName: "Hanoi, Vietnam", flag: "🇻🇳" },
  { lat: 3.1390, lng: 101.6869, cityName: "Kuala Lumpur, Malaysia", flag: "🇲🇾" },
  { lat: 40.7128, lng: -74.0060, cityName: "New York, USA", flag: "🇺🇸" },
  { lat: 37.7749, lng: -122.4194, cityName: "San Francisco, USA", flag: "🇺🇸" },
  { lat: 34.0522, lng: -118.2437, cityName: "Los Angeles, USA", flag: "🇺🇸" },
  { lat: 51.5074, lng: -0.1278, cityName: "London, UK", flag: "🇬🇧" },
  { lat: 48.8566, lng: 2.3522, cityName: "Paris, France", flag: "🇫🇷" },
  { lat: 41.9028, lng: 12.4964, cityName: "Rome, Italy", flag: "🇮🇹" },
  { lat: 41.3851, lng: 2.1734, cityName: "Barcelona, Spain", flag: "🇪🇸" },
  { lat: 41.0082, lng: 28.9784, cityName: "Istanbul, Turkey", flag: "🇹🇷" },
  { lat: 19.0760, lng: 72.8777, cityName: "Mumbai, India", flag: "🇮🇳" },
  { lat: -33.8688, lng: 151.2093, cityName: "Sydney, Australia", flag: "🇦🇺" },
  { lat: 43.6532, lng: -79.3832, cityName: "Toronto, Canada", flag: "🇨🇦" },
  { lat: -23.5505, lng: -46.6333, cityName: "São Paulo, Brazil", flag: "🇧🇷" },
];

// ─── Async Storage helpers ───────────────────────────────────────────────────
async function loadRecentLocations(): Promise<LocationState[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as LocationState[]) : [];
  } catch {
    return [];
  }
}

async function saveRecentLocation(loc: LocationState): Promise<void> {
  try {
    const existing = await loadRecentLocations();
    const filtered = existing.filter((r) => r.cityName !== loc.cityName);
    const updated = [loc, ...filtered].slice(0, MAX_RECENT);
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  } catch {}
}

// ─── Section data types ──────────────────────────────────────────────────────
type SectionItem = LocationState & { flag?: string; placeId?: string };
type Section = { title: string; data: SectionItem[] };

export default function LocationPickerScreen() {
  const { state, setLocation } = useSwipe();
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [recentLocations, setRecentLocations] = useState<LocationState[]>([]);
  const inputRef = useRef<TextInput>(null);

  // Load recent locations on mount
  useEffect(() => {
    loadRecentLocations().then(setRecentLocations);
  }, []);

  const debouncedQuery = useDebounce(query, 350);
  const isSearching = debouncedQuery.trim().length > 1;

  const { data: predictions, isFetching: isFetchingPredictions } =
    trpc.places.autocomplete.useQuery(
      { query: debouncedQuery },
      { enabled: isSearching }
    );

  const { data: placeDetails } = trpc.places.details.useQuery(
    { placeId: selectedPlaceId! },
    { enabled: !!selectedPlaceId }
  );

  useEffect(() => {
    if (placeDetails && selectedPlaceId) {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      saveRecentLocation(placeDetails).then(() =>
        loadRecentLocations().then(setRecentLocations)
      );
      setLocation(placeDetails);
      router.back();
    }
  }, [placeDetails, selectedPlaceId]);

  const handleSelectLocation = useCallback(
    (loc: LocationState) => {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      saveRecentLocation(loc).then(() =>
        loadRecentLocations().then(setRecentLocations)
      );
      setLocation(loc);
      router.back();
    },
    [setLocation, router]
  );

  const handleUseMyLocation = useCallback(async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Please enable location access in your device settings.",
          [{ text: "OK" }]
        );
        setIsLocating(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const [address] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      const cityName =
        [address?.district ?? address?.subregion, address?.city, address?.country]
          .filter(Boolean)
          .join(", ") || "My Location";

      const newLoc: LocationState = {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        cityName,
      };

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      await saveRecentLocation(newLoc);
      setLocation(newLoc);
      router.back();
    } catch {
      Alert.alert("Error", "Could not get your location. Please try again.");
    } finally {
      setIsLocating(false);
    }
  }, [setLocation, router]);

  // Build sections for the default (non-searching) view
  const sections: Section[] = [];

  if (recentLocations.length > 0) {
    sections.push({ title: "Recent", data: recentLocations });
  }

  const nearby = getRegionalSuggestions(state.location.lat, state.location.lng);
  if (nearby.length > 0) {
    sections.push({ title: "Near You", data: nearby });
  }

  sections.push({ title: "Popular Worldwide", data: POPULAR_WORLDWIDE });

  // ─── Render helpers ────────────────────────────────────────────────────────
  const renderSectionHeader = useCallback(
    ({ section }: { section: Section }) => (
      <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>
          {section.title}
        </Text>
      </View>
    ),
    [colors]
  );

  const renderLocationRow = useCallback(
    (item: SectionItem, icon: "location.fill" | "clock" | "globe", isSelected?: boolean) => (
      <Pressable
        onPress={() => handleSelectLocation(item)}
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: isSelected ? `${colors.primary}12` : "transparent",
            borderBottomColor: colors.border,
          },
          pressed && { opacity: 0.6 },
        ]}
      >
        <View
          style={[
            styles.rowIcon,
            { backgroundColor: isSelected ? colors.primary : colors.surface },
          ]}
        >
          {item.flag ? (
            <Text style={styles.flagEmoji}>{item.flag}</Text>
          ) : (
            <IconSymbol
              name={icon}
              size={15}
              color={isSelected ? "#fff" : colors.muted}
            />
          )}
        </View>
        <View style={styles.rowText}>
          <Text
            style={[
              styles.rowName,
              { color: isSelected ? colors.primary : colors.foreground },
            ]}
            numberOfLines={1}
          >
            {item.cityName}
          </Text>
        </View>
        {isSelected && (
          <IconSymbol name="checkmark.circle.fill" size={18} color={colors.primary} />
        )}
      </Pressable>
    ),
    [colors, handleSelectLocation]
  );

  const renderSectionItem = useCallback(
    ({ item, section }: { item: SectionItem; section: Section }) => {
      const isSelected = item.cityName === state.location.cityName;
      const icon =
        section.title === "Recent"
          ? "clock"
          : section.title === "Near You"
          ? "location.fill"
          : "globe";
      return renderLocationRow(item, icon, isSelected);
    },
    [state.location.cityName, renderLocationRow]
  );

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
          hitSlop={12}
          style={({ pressed }) => [pressed && { opacity: 0.6 }]}
        >
          <IconSymbol name="xmark" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Choose Location
        </Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Search Row */}
      <View style={[styles.searchArea, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <IconSymbol name="magnifyingglass" size={17} color={colors.muted} />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="City, district, neighbourhood…"
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoFocus
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => setQuery("")}
              hitSlop={8}
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
            >
              <IconSymbol name="xmark.circle.fill" size={17} color={colors.muted} />
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={handleUseMyLocation}
          disabled={isLocating}
          style={({ pressed }) => [
            styles.gpsButton,
            { backgroundColor: colors.primary },
            (pressed || isLocating) && { opacity: 0.75 },
          ]}
        >
          {isLocating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <IconSymbol name="location.fill" size={17} color="#fff" />
          )}
          <Text style={styles.gpsText}>
            {isLocating ? "Locating…" : "Use My Location"}
          </Text>
        </Pressable>
      </View>

      {/* Results */}
      {isSearching ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        >
          <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
            <Text style={[styles.sectionTitle, { color: colors.muted }]}>
              {isFetchingPredictions ? "Searching…" : `Results for "${debouncedQuery}"`}
            </Text>
          </View>
          {!isFetchingPredictions && (predictions ?? []).length === 0 && (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.muted }]}>No places found</Text>
            </View>
          )}
          {(predictions ?? []).map((item) => (
            <Pressable
              key={item.placeId}
              onPress={() => setSelectedPlaceId(item.placeId)}
              style={({ pressed }) => [
                styles.row,
                { borderBottomColor: colors.border },
                pressed && { opacity: 0.6 },
              ]}
            >
              <View style={[styles.rowIcon, { backgroundColor: colors.surface }]}>
                <IconSymbol name="magnifyingglass" size={15} color={colors.muted} />
              </View>
              <Text style={[styles.rowName, { color: colors.foreground }]} numberOfLines={1}>
                {item.description}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.cityName}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          renderSectionHeader={renderSectionHeader}
          renderItem={renderSectionItem}
        />
      )}
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
    paddingBottom: 14,
    borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  searchArea: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  gpsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
  },
  gpsText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 13,
    gap: 14,
    borderBottomWidth: 0.5,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  flagEmoji: { fontSize: 19 },
  rowText: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: "500" },
  emptyState: { padding: 40, alignItems: "center" },
  emptyText: { fontSize: 15, textAlign: "center" },
});
