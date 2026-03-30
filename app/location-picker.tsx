import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useSwipe } from "@/lib/swipe-context";
import { useColors } from "@/hooks/use-colors";
import { LocationState } from "@/lib/types";
import { trpc } from "@/lib/trpc";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// Preset cities for quick selection
const PRESET_CITIES: LocationState[] = [
  { lat: 37.7749, lng: -122.4194, cityName: "San Francisco, CA" },
  { lat: 40.7128, lng: -74.006, cityName: "New York, NY" },
  { lat: 34.0522, lng: -118.2437, cityName: "Los Angeles, CA" },
  { lat: 41.8781, lng: -87.6298, cityName: "Chicago, IL" },
  { lat: 29.7604, lng: -95.3698, cityName: "Houston, TX" },
  { lat: 33.749, lng: -84.388, cityName: "Atlanta, GA" },
  { lat: 47.6062, lng: -122.3321, cityName: "Seattle, WA" },
  { lat: 25.7617, lng: -80.1918, cityName: "Miami, FL" },
  { lat: 42.3601, lng: -71.0589, cityName: "Boston, MA" },
  { lat: 39.9526, lng: -75.1652, cityName: "Philadelphia, PA" },
  { lat: 35.6762, lng: 139.6503, cityName: "Tokyo, Japan" },
  { lat: 51.5074, lng: -0.1278, cityName: "London, UK" },
  { lat: 48.8566, lng: 2.3522, cityName: "Paris, France" },
  { lat: 1.3521, lng: 103.8198, cityName: "Singapore" },
  { lat: 22.3193, lng: 114.1694, cityName: "Hong Kong" },
  { lat: -33.8688, lng: 151.2093, cityName: "Sydney, Australia" },
  { lat: 43.6532, lng: -79.3832, cityName: "Toronto, Canada" },
  { lat: 19.4326, lng: -99.1332, cityName: "Mexico City, Mexico" },
  { lat: 55.7558, lng: 37.6173, cityName: "Moscow, Russia" },
  { lat: 28.6139, lng: 77.209, cityName: "New Delhi, India" },
];

export default function LocationPickerScreen() {
  const { state, setLocation } = useSwipe();
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  const debouncedQuery = useDebounce(query, 350);
  const isSearching = debouncedQuery.trim().length > 1;

  const { data: predictions, isFetching: isFetchingPredictions } =
    trpc.places.autocomplete.useQuery(
      { query: debouncedQuery },
      { enabled: isSearching }
    );

  const { data: placeDetails } = trpc.places.details.useQuery(
    { placeId: selectedPlaceId! },
    {
      enabled: !!selectedPlaceId,
    }
  );

  useEffect(() => {
    if (placeDetails && selectedPlaceId) {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setLocation(placeDetails);
      router.back();
    }
  }, [placeDetails, selectedPlaceId]);

  const filteredCities = PRESET_CITIES.filter((c) =>
    query.trim().length > 0
      ? c.cityName.toLowerCase().includes(query.toLowerCase())
      : true
  );

  const handleSelectCity = useCallback(
    (city: LocationState) => {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setLocation(city);
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
          "Please enable location access in your device settings to use this feature.",
          [{ text: "OK" }]
        );
        setIsLocating(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Reverse geocode to get city name
      const [address] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      const cityName = [address?.city, address?.region, address?.country]
        .filter(Boolean)
        .join(", ") || "My Location";

      const newLocation: LocationState = {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        cityName,
      };

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setLocation(newLocation);
      router.back();
    } catch (err) {
      Alert.alert("Error", "Could not get your location. Please try again.");
    } finally {
      setIsLocating(false);
    }
  }, [setLocation, router]);

  const renderItem = useCallback(
    ({ item }: { item: LocationState }) => {
      const isSelected = item.cityName === state.location.cityName;
      return (
        <Pressable
          onPress={() => handleSelectCity(item)}
          style={({ pressed }) => [
            styles.cityRow,
            {
              backgroundColor: isSelected ? `${colors.primary}15` : "transparent",
              borderBottomColor: colors.border,
            },
            pressed && { opacity: 0.6 },
          ]}
        >
          <View
            style={[
              styles.cityIcon,
              { backgroundColor: isSelected ? colors.primary : colors.surface },
            ]}
          >
            <IconSymbol
              name="location.fill"
              size={16}
              color={isSelected ? "#fff" : colors.muted}
            />
          </View>
          <Text
            style={[
              styles.cityName,
              { color: isSelected ? colors.primary : colors.foreground },
            ]}
          >
            {item.cityName}
          </Text>
          {isSelected && (
            <IconSymbol name="checkmark.circle.fill" size={20} color={colors.primary} />
          )}
        </Pressable>
      );
    },
    [state.location.cityName, colors, handleSelectCity]
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
          style={({ pressed }) => [pressed && { opacity: 0.6 }]}
        >
          <IconSymbol name="xmark" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Choose Location
        </Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Search Input */}
      <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <IconSymbol name="magnifyingglass" size={18} color={colors.muted} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search city or location..."
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoFocus
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
              <IconSymbol name="xmark.circle.fill" size={18} color={colors.muted} />
            </Pressable>
          )}
        </View>

        {/* Use My Location */}
        <Pressable
          onPress={handleUseMyLocation}
          disabled={isLocating}
          style={({ pressed }) => [
            styles.gpsButton,
            { backgroundColor: colors.primary },
            pressed && { opacity: 0.85 },
            isLocating && { opacity: 0.7 },
          ]}
        >
          {isLocating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <IconSymbol name="location.fill" size={18} color="#fff" />
          )}
          <Text style={styles.gpsButtonText}>
            {isLocating ? "Locating..." : "Use My Location"}
          </Text>
        </Pressable>
      </View>

      {/* City List */}
      {isSearching ? (
        <FlatList
          data={predictions ?? []}
          keyExtractor={(item) => item.placeId}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          ListHeaderComponent={
            <Text style={[styles.listHeader, { color: colors.muted }]}>
              {isFetchingPredictions ? "Searching..." : `Results for "${debouncedQuery}"`}
            </Text>
          }
          ListEmptyComponent={
            !isFetchingPredictions ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: colors.muted }]}>
                  No places found for "{debouncedQuery}"
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setSelectedPlaceId(item.placeId)}
              style={({ pressed }) => [
                styles.cityRow,
                { borderBottomColor: colors.border },
                pressed && { opacity: 0.6 },
              ]}
            >
              <View style={[styles.cityIcon, { backgroundColor: colors.surface }]}>
                <IconSymbol name="location.fill" size={16} color={colors.muted} />
              </View>
              <Text style={[styles.cityName, { color: colors.foreground }]}>
                {item.description}
              </Text>
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          data={filteredCities}
          renderItem={renderItem}
          keyExtractor={(item) => item.cityName}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          ListHeaderComponent={
            <Text style={[styles.listHeader, { color: colors.muted }]}>
              Popular Cities
            </Text>
          }
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
    paddingBottom: 16,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  searchContainer: {
    padding: 16,
    gap: 12,
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
  gpsButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  listHeader: {
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: 20,
    paddingVertical: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: 0.5,
  },
  cityIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cityName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
    textAlign: "center",
  },
});
