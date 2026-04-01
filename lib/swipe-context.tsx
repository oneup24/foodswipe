import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { Restaurant, FilterState, LocationState, CuisineType, PriceLevel } from "./types";
import { trpc } from "./trpc";
import { useLanguage } from "../hooks/use-language";

const LIKED_STORAGE_KEY = "@foodswipe_liked";
const CUISINE_PREFS_KEY = "@foodswipe_cuisine_prefs";

type State = {
  cardStack: Restaurant[];
  likedRestaurants: Restaurant[];
  filters: FilterState;
  location: LocationState;
  isLoading: boolean;
  allRestaurants: Restaurant[];
  seenPlaceIds: Set<string>;
  nextPageToken: string | null;
  searchLat: number;
  searchLng: number;
  searchRadius: number;
  isFetchingMore: boolean;
  cuisineScores: Record<string, number>;
};

type Action =
  | { type: "SWIPE_RIGHT"; restaurant: Restaurant }
  | { type: "SWIPE_LEFT" }
  | { type: "SWIPE_UP"; restaurant: Restaurant }
  | { type: "SET_LIKED"; liked: Restaurant[] }
  | { type: "UNLIKE"; id: string }
  | { type: "SET_FILTERS"; filters: FilterState }
  | { type: "SET_LOCATION"; location: LocationState }
  | { type: "SET_RESTAURANTS"; restaurants: Restaurant[]; nextPageToken: string | null }
  | { type: "APPEND_RESTAURANTS"; restaurants: Restaurant[]; nextPageToken: string | null; searchLat: number; searchLng: number; searchRadius: number }
  | { type: "SET_FETCHING_MORE"; loading: boolean }
  | { type: "RESET_STACK" }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_CUISINE_SCORES"; scores: Record<string, number> };

const DEFAULT_FILTERS: FilterState = {
  cuisines: [],
  priceRange: [],
  maxDistance: 2,
  minRating: 0,
  openNow: false,
};

const DEFAULT_LOCATION: LocationState = {
  lat: 37.7749,
  lng: -122.4194,
  cityName: "San Francisco, CA",
};

function filterRestaurants(all: Restaurant[], filters: FilterState): Restaurant[] {
  return all.filter((r) => {
    if (filters.cuisines.length > 0 && !r.cuisine.some((c) => filters.cuisines.includes(c as CuisineType))) {
      return false;
    }
    if (filters.priceRange.length > 0 && !filters.priceRange.includes(r.priceLevel as PriceLevel)) {
      return false;
    }
    if (filters.minRating && r.rating < filters.minRating) {
      return false;
    }
    if (filters.maxDistance && r.distance > filters.maxDistance) {
      return false;
    }
    if (filters.openNow && !r.isOpen) {
      return false;
    }
    return true;
  });
}

function buildStack(all: Restaurant[], filters: FilterState): Restaurant[] {
  const filtered = filterRestaurants(all, filters);
  return [...filtered].sort(() => Math.random() - 0.5);
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SWIPE_RIGHT": {
      const newStack = state.cardStack.slice(1);
      const alreadyLiked = state.likedRestaurants.some((r) => r.id === action.restaurant.id);
      const newLiked = alreadyLiked
        ? state.likedRestaurants
        : [action.restaurant, ...state.likedRestaurants];
      const newScores = { ...state.cuisineScores };
      action.restaurant.cuisine.forEach((c) => {
        newScores[c] = (newScores[c] ?? 0) + 2;
      });
      return { ...state, cardStack: newStack, likedRestaurants: newLiked, cuisineScores: newScores };
    }
    case "SWIPE_UP": {
      const newStack = state.cardStack.slice(1);
      const alreadyLiked = state.likedRestaurants.some((r) => r.id === action.restaurant.id);
      const newLiked = alreadyLiked
        ? state.likedRestaurants
        : [action.restaurant, ...state.likedRestaurants];
      const newScores = { ...state.cuisineScores };
      action.restaurant.cuisine.forEach((c) => {
        newScores[c] = (newScores[c] ?? 0) + 3;
      });
      return { ...state, cardStack: newStack, likedRestaurants: newLiked, cuisineScores: newScores };
    }
    case "SWIPE_LEFT": {
      const passed = state.cardStack[0];
      const newScores = { ...state.cuisineScores };
      if (passed) {
        passed.cuisine.forEach((c) => {
          newScores[c] = Math.max(0, (newScores[c] ?? 0) - 1);
        });
      }
      return { ...state, cardStack: state.cardStack.slice(1), cuisineScores: newScores };
    }
    case "SET_LIKED":
      return { ...state, likedRestaurants: action.liked };
    case "UNLIKE":
      return {
        ...state,
        likedRestaurants: state.likedRestaurants.filter((r) => r.id !== action.id),
      };
    case "SET_FILTERS": {
      const newStack = buildStack(state.allRestaurants, action.filters);
      return { ...state, filters: action.filters, cardStack: newStack };
    }
    case "SET_LOCATION":
      return {
        ...state,
        location: action.location,
        allRestaurants: [],
        cardStack: [],
        isLoading: true,
        seenPlaceIds: new Set<string>(),
        nextPageToken: null,
        searchLat: action.location.lat,
        searchLng: action.location.lng,
        searchRadius: 2000,
        isFetchingMore: false,
      };
    case "SET_RESTAURANTS": {
      const newStack = buildStack(action.restaurants, state.filters);
      const seenPlaceIds = new Set(action.restaurants.map((r) => r.id));
      return {
        ...state,
        allRestaurants: action.restaurants,
        cardStack: newStack,
        seenPlaceIds,
        nextPageToken: action.nextPageToken,
        searchLat: state.location.lat,
        searchLng: state.location.lng,
        searchRadius: 2000,
      };
    }
    case "APPEND_RESTAURANTS": {
      const newOnes = action.restaurants.filter((r) => !state.seenPlaceIds.has(r.id));
      const newSeenIds = new Set(state.seenPlaceIds);
      action.restaurants.forEach((r) => newSeenIds.add(r.id));
      const filteredNew = filterRestaurants(newOnes, state.filters);
      const shuffledNew = [...filteredNew].sort(() => Math.random() - 0.5);
      return {
        ...state,
        allRestaurants: [...state.allRestaurants, ...newOnes],
        cardStack: [...state.cardStack, ...shuffledNew],
        seenPlaceIds: newSeenIds,
        nextPageToken: action.nextPageToken,
        searchLat: action.searchLat,
        searchLng: action.searchLng,
        searchRadius: action.searchRadius,
        isFetchingMore: false,
      };
    }
    case "SET_FETCHING_MORE":
      return { ...state, isFetchingMore: action.loading };
    case "RESET_STACK": {
      const newStack = buildStack(state.allRestaurants, state.filters);
      return { ...state, cardStack: newStack };
    }
    case "SET_LOADING":
      return { ...state, isLoading: action.loading };
    case "SET_CUISINE_SCORES":
      return { ...state, cuisineScores: action.scores };
    default:
      return state;
  }
}

type SwipeContextType = {
  state: State;
  swipeRight: (restaurant: Restaurant) => void;
  swipeLeft: () => void;
  swipeUp: (restaurant: Restaurant) => void;
  unlike: (id: string) => void;
  setFilters: (filters: FilterState) => void;
  setLocation: (location: LocationState) => void;
  resetStack: () => void;
  currentCard: Restaurant | null;
  cuisineScores: Record<string, number>;
};

const SwipeContext = createContext<SwipeContextType | null>(null);

export function SwipeProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    cardStack: [],
    likedRestaurants: [],
    filters: DEFAULT_FILTERS,
    location: DEFAULT_LOCATION,
    isLoading: true,
    allRestaurants: [],
    seenPlaceIds: new Set<string>(),
    nextPageToken: null,
    searchLat: DEFAULT_LOCATION.lat,
    searchLng: DEFAULT_LOCATION.lng,
    searchRadius: 2000,
    isFetchingMore: false,
    cuisineScores: {},
  });

  const { currentLanguage } = useLanguage();
  const utils = trpc.useUtils();

  // Initial fetch via useQuery — re-runs whenever location changes
  const { data: nearbyData, isLoading: isFetchingRestaurants, error: trpcError } =
    trpc.places.nearbyRestaurants.useQuery(
      { lat: state.location.lat, lng: state.location.lng, radius: 2000, language: currentLanguage as 'en' | 'es' | 'ja' | 'zh-HK' },
      { retry: false },
    );

  useEffect(() => {
    if (trpcError) {
      console.error("🚨 tRPC nearbyRestaurants error:", trpcError.message);
    }
    if (nearbyData) {
      console.log("✅ Got", nearbyData.restaurants.length, "restaurants from Google Places API");
    }
  }, [nearbyData, trpcError]);

  useEffect(() => {
    if (nearbyData) {
      dispatch({
        type: "SET_RESTAURANTS",
        restaurants: nearbyData.restaurants as Restaurant[],
        nextPageToken: nearbyData.nextPageToken,
      });
    }
  }, [nearbyData]);

  useEffect(() => {
    dispatch({ type: "SET_LOADING", loading: isFetchingRestaurants });
  }, [isFetchingRestaurants]);

  // Imperatively fetch more restaurants: paginate first, then expand search with random offsets
  const fetchMoreRestaurants = useCallback(async (snap: State) => {
    dispatch({ type: "SET_FETCHING_MORE", loading: true });

    const seenIds = new Set(snap.seenPlaceIds);
    let lat = snap.searchLat;
    let lng = snap.searchLng;
    let radius = snap.searchRadius;
    let pageToken: string | null = snap.nextPageToken;

    for (let attempt = 0; attempt < 3; attempt++) {
      // First attempt: use page token if available. Subsequent attempts: random offset.
      if (attempt > 0 || !pageToken) {
        const magnitude = 0.01 + Math.random() * 0.04;
        const angle = Math.random() * 2 * Math.PI;
        lat = snap.location.lat + magnitude * Math.sin(angle);
        lng = snap.location.lng + magnitude * Math.cos(angle);
        radius = Math.min(radius + 500, snap.filters.maxDistance * 1000);
        pageToken = null;
      }

      try {
        const result = await utils.places.nearbyRestaurants.fetch({
          lat,
          lng,
          radius,
          language: currentLanguage as 'en' | 'es' | 'ja' | 'zh-HK',
          ...(pageToken ? { pageToken } : {}),
        });

        const newCount = result.restaurants.filter((r) => !seenIds.has(r.id)).length;
        result.restaurants.forEach((r) => seenIds.add(r.id));

        dispatch({
          type: "APPEND_RESTAURANTS",
          restaurants: result.restaurants,
          nextPageToken: result.nextPageToken,
          searchLat: lat,
          searchLng: lng,
          searchRadius: radius,
        });

        if (newCount >= 5) return;

        // Fewer than 5 novel results — loop with a new offset
        if (attempt < 2) {
          dispatch({ type: "SET_FETCHING_MORE", loading: true });
          pageToken = null;
        }
      } catch (err) {
        console.error("fetchMoreRestaurants error:", err);
        dispatch({ type: "SET_FETCHING_MORE", loading: false });
        return;
      }
    }
  }, [utils]);

  // Pre-fetch next batch when the stack gets low (≤5 cards left)
  useEffect(() => {
    if (
      state.cardStack.length <= 5 &&
      !state.isFetchingMore &&
      !state.isLoading &&
      state.allRestaurants.length > 0
    ) {
      fetchMoreRestaurants(state);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.cardStack.length, state.isFetchingMore, state.isLoading, state.allRestaurants.length]);

  // Auto-detect location on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const [address] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });

        const cityName =
          [address?.city, address?.region, address?.country].filter(Boolean).join(", ") ||
          "My Location";

        dispatch({
          type: "SET_LOCATION",
          location: { lat: loc.coords.latitude, lng: loc.coords.longitude, cityName },
        });
      } catch {
        // Fall back to default location silently
      }
    })();
  }, []);

  // Load persisted liked restaurants and cuisine scores on mount
  useEffect(() => {
    AsyncStorage.multiGet([LIKED_STORAGE_KEY, CUISINE_PREFS_KEY]).then(([likedEntry, scoresEntry]) => {
      if (likedEntry[1]) {
        try {
          const liked = JSON.parse(likedEntry[1]) as Restaurant[];
          dispatch({ type: "SET_LIKED", liked });
        } catch {}
      }
      if (scoresEntry[1]) {
        try {
          const scores = JSON.parse(scoresEntry[1]) as Record<string, number>;
          dispatch({ type: "SET_CUISINE_SCORES", scores });
        } catch {}
      }
    });
  }, []);

  // Persist liked restaurants whenever they change
  useEffect(() => {
    AsyncStorage.setItem(LIKED_STORAGE_KEY, JSON.stringify(state.likedRestaurants));
  }, [state.likedRestaurants]);

  // Persist cuisine scores whenever they change
  useEffect(() => {
    if (Object.keys(state.cuisineScores).length > 0) {
      AsyncStorage.setItem(CUISINE_PREFS_KEY, JSON.stringify(state.cuisineScores));
    }
  }, [state.cuisineScores]);

  const swipeRight = useCallback((restaurant: Restaurant) => {
    dispatch({ type: "SWIPE_RIGHT", restaurant });
  }, []);

  const swipeLeft = useCallback(() => {
    dispatch({ type: "SWIPE_LEFT" });
  }, []);

  const swipeUp = useCallback((restaurant: Restaurant) => {
    dispatch({ type: "SWIPE_UP", restaurant });
  }, []);

  const unlike = useCallback((id: string) => {
    dispatch({ type: "UNLIKE", id });
  }, []);

  const setFilters = useCallback((filters: FilterState) => {
    dispatch({ type: "SET_FILTERS", filters });
  }, []);

  const setLocation = useCallback((location: LocationState) => {
    dispatch({ type: "SET_LOCATION", location });
  }, []);

  const resetStack = useCallback(() => {
    dispatch({ type: "RESET_STACK" });
  }, []);

  const currentCard = state.cardStack[0] ?? null;

  return (
    <SwipeContext.Provider
      value={{
        state,
        swipeRight,
        swipeLeft,
        swipeUp,
        unlike,
        setFilters,
        setLocation,
        resetStack,
        currentCard,
        cuisineScores: state.cuisineScores,
      }}
    >
      {children}
    </SwipeContext.Provider>
  );
}

export function useSwipe() {
  const ctx = useContext(SwipeContext);
  if (!ctx) throw new Error("useSwipe must be used within SwipeProvider");
  return ctx;
}
