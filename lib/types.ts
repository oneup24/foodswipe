export type PriceLevel = 1 | 2 | 3 | 4;

export type CuisineType =
  | "Italian"
  | "Japanese"
  | "Chinese"
  | "Mexican"
  | "American"
  | "Thai"
  | "Indian"
  | "French"
  | "Mediterranean"
  | "Korean"
  | "Vietnamese"
  | "Greek"
  | "Spanish"
  | "Middle Eastern"
  | "Seafood"
  | "Steakhouse"
  | "Pizza"
  | "Sushi"
  | "Burgers"
  | "Desserts";

export type Restaurant = {
  id: string;
  name: string;
  nameLocalized?: Record<string, string>; // { 'zh-HK': '樂天皇朝', 'es': 'Paradise Dynasty', etc }
  cuisine: string[];
  rating: number;
  reviewCount: number;
  priceLevel: PriceLevel;
  distance: number; // km
  imageUrl: string;
  photos: string[];
  address: string;
  isOpen: boolean;
  openingHours?: string;
  lat: number;
  lng: number;
  description?: string;
};

export type SwipeDirection = "left" | "right" | "up";

export type FilterState = {
  cuisines: CuisineType[];
  priceRange: PriceLevel[];
  maxDistance: number;
  minRating: number;
  openNow: boolean;
};

export type LocationState = {
  lat: number;
  lng: number;
  cityName: string;
};

export type AppState = {
  restaurants: Restaurant[];
  cardStack: Restaurant[];
  likedRestaurants: Restaurant[];
  filters: FilterState;
  location: LocationState;
  isLoading: boolean;
};

export type PlannedVisit = {
  restaurantId: string;
  restaurantName: string;
  notificationId: string;
  timestamp: number;
};

export type UserList = {
  id: string;
  name: string;
  emoji: string;
  restaurantIds: string[];
  createdAt: number;
  isDefault: boolean;
  description?: string;
  shareToken?: string; // stores the full share URL once generated
};
