import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Restaurant, FilterState, LocationState, CuisineType, PriceLevel } from "./types";
import { MOCK_RESTAURANTS, getFilteredRestaurants } from "./mock-data";
import { trpc } from "./trpc";

const LIKED_STORAGE_KEY = "@foodswipe_liked";

type State = {
  cardStack: Restaurant[];
  likedRestaurants: Restaurant[];
  filters: FilterState;
  location: LocationState;
  isLoading: boolean;
  allRestaurants: Restaurant[];
};

type Action =
  | { type: "SWIPE_RIGHT"; restaurant: Restaurant }
  | { type: "SWIPE_LEFT" }
  | { type: "SWIPE_UP"; restaurant: Restaurant }
  | { type: "SET_LIKED"; liked: Restaurant[] }
  | { type: "UNLIKE"; id: string }
  | { type: "SET_FILTERS"; filters: FilterState }
  | { type: "SET_LOCATION"; location: LocationState }
  | { type: "SET_RESTAURANTS"; restaurants: Restaurant[] }
  | { type: "RESET_STACK" }
  | { type: "SET_LOADING"; loading: boolean };

const DEFAULT_FILTERS: FilterState = {
  cuisines: [],
  priceRange: [],
  maxDistance: 10,
  minRating: 0,
  openNow: false,
};

const DEFAULT_LOCATION: LocationState = {
  lat: 37.7749,
  lng: -122.4194,
  cityName: "San Francisco, CA",
};

function buildStack(all: Restaurant[], filters: FilterState): Restaurant[] {
  const filtered = getFilteredRestaurants(all, filters);
  // Shuffle for variety
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
      return { ...state, cardStack: newStack, likedRestaurants: newLiked };
    }
    case "SWIPE_UP": {
      const newStack = state.cardStack.slice(1);
      const alreadyLiked = state.likedRestaurants.some((r) => r.id === action.restaurant.id);
      const newLiked = alreadyLiked
        ? state.likedRestaurants
        : [action.restaurant, ...state.likedRestaurants];
      return { ...state, cardStack: newStack, likedRestaurants: newLiked };
    }
    case "SWIPE_LEFT": {
      return { ...state, cardStack: state.cardStack.slice(1) };
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
      return { ...state, location: action.location };
    case "SET_RESTAURANTS": {
      const newStack = buildStack(action.restaurants, state.filters);
      return { ...state, allRestaurants: action.restaurants, cardStack: newStack };
    }
    case "RESET_STACK": {
      const newStack = buildStack(state.allRestaurants, state.filters);
      return { ...state, cardStack: newStack };
    }
    case "SET_LOADING":
      return { ...state, isLoading: action.loading };
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
};

const SwipeContext = createContext<SwipeContextType | null>(null);

export function SwipeProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    cardStack: buildStack(MOCK_RESTAURANTS, DEFAULT_FILTERS),
    likedRestaurants: [],
    filters: DEFAULT_FILTERS,
    location: DEFAULT_LOCATION,
    isLoading: false,
    allRestaurants: MOCK_RESTAURANTS,
  });

  // Fetch real restaurants from Google Places when location changes
  const { data: nearbyData, isLoading: isFetchingRestaurants } =
    trpc.places.nearbyRestaurants.useQuery(
      { lat: state.location.lat, lng: state.location.lng },
      { retry: false },
    );

  useEffect(() => {
    if (nearbyData && nearbyData.length > 0) {
      dispatch({ type: "SET_RESTAURANTS", restaurants: nearbyData as Restaurant[] });
    }
  }, [nearbyData]);

  useEffect(() => {
    dispatch({ type: "SET_LOADING", loading: isFetchingRestaurants });
  }, [isFetchingRestaurants]);

  // Load persisted liked restaurants on mount
  useEffect(() => {
    AsyncStorage.getItem(LIKED_STORAGE_KEY).then((data) => {
      if (data) {
        try {
          const liked = JSON.parse(data) as Restaurant[];
          dispatch({ type: "SET_LIKED", liked });
        } catch {}
      }
    });
  }, []);

  // Persist liked restaurants whenever they change
  useEffect(() => {
    AsyncStorage.setItem(LIKED_STORAGE_KEY, JSON.stringify(state.likedRestaurants));
  }, [state.likedRestaurants]);

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
