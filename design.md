# FoodSwipe — Design Document

## App Concept
A Tinder-style food & restaurant discovery app. Users swipe right to "like" a restaurant/dish, swipe left to "pass," and can view their saved matches. Location can be auto-detected or manually entered.

---

## Brand & Color Palette

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `primary` | `#FF4B4B` | `#FF6B6B` | Swipe-right (like) button, accents |
| `secondary` | `#4ECDC4` | `#45B7AA` | Swipe-left (pass) button |
| `background` | `#FAFAFA` | `#111111` | Screen background |
| `surface` | `#FFFFFF` | `#1C1C1E` | Cards, sheets |
| `foreground` | `#1A1A1A` | `#F5F5F5` | Primary text |
| `muted` | `#8E8E93` | `#8E8E93` | Secondary text, labels |
| `border` | `#E5E5EA` | `#2C2C2E` | Dividers, card borders |
| `success` | `#34C759` | `#30D158` | Match confirmed |
| `warning` | `#FF9F0A` | `#FFD60A` | Distance badge |
| `error` | `#FF3B30` | `#FF453A` | Dislike/pass indicator |

---

## Screen List

### 1. Discover Screen (Home / Main Tab)
- **Primary content**: Stack of swipeable restaurant cards
- **Card content**: Hero food photo, restaurant name, cuisine type, rating stars, distance badge, price range indicator ($ - $$$$)
- **Swipe actions**: Right = Like ❤️, Left = Pass ✗, Up = Super Like ⭐
- **Action buttons**: Pass (red X), Super Like (blue star), Like (green heart) at bottom
- **Location bar**: Shows current city/area at top with tap-to-change
- **Empty state**: "No more restaurants nearby" with refresh button

### 2. Liked Screen (Matches Tab)
- **Primary content**: Grid of liked restaurants (2-column)
- **Card content**: Thumbnail, name, cuisine, rating
- **Tap action**: Opens restaurant detail sheet
- **Empty state**: Illustration + "Start swiping to save favorites"

### 3. Filters Screen (accessible via top-right icon on Discover)
- **Content**: Bottom sheet modal
- **Filters**: Cuisine type (multi-select chips), Price range ($ to $$$$), Distance radius (slider 0.5–20km), Rating minimum (star selector), Open now toggle
- **Actions**: Apply Filters, Reset

### 4. Restaurant Detail Sheet (modal)
- **Content**: Full-screen bottom sheet
- **Sections**: Large hero image, name + cuisine + rating row, address + distance, opening hours, price range, cuisine tags, action buttons (Like/Pass/Share)

### 5. Location Picker Screen (modal)
- **Content**: Search input for city/address, "Use My Location" button, recent searches list
- **Behavior**: Geocodes input to lat/lng for restaurant search

---

## Key User Flows

### Flow 1: Swipe & Discover
1. Open app → Discover tab loads with location-based cards
2. User swipes right → card flies off right with heart overlay → next card appears
3. User swipes left → card flies off left with X overlay → next card appears
4. User taps ❤️ button → same as swipe right with haptic feedback
5. Stack runs low → auto-fetch more restaurants

### Flow 2: Change Location
1. Tap location bar at top of Discover screen
2. Location Picker modal opens
3. Type city name OR tap "Use My Location"
4. Confirm → Discover screen refreshes with new location cards

### Flow 3: Apply Filters
1. Tap filter icon (top right of Discover)
2. Filters bottom sheet slides up
3. Select cuisine types, price range, distance
4. Tap "Apply" → card stack refreshes with filtered results

### Flow 4: View Liked Restaurants
1. Tap "Liked" tab
2. Grid of saved restaurants appears
3. Tap any card → Detail sheet slides up
4. View full info, tap "Get Directions" or "Share"

---

## Layout & Navigation

- **Tab Bar**: 2 tabs — Discover (fork/knife icon) + Liked (heart icon)
- **Top Bar on Discover**: Location pill (left) + Filter icon (right)
- **Card Stack**: Centered, fills ~70% of screen height, slight shadow + rounded corners
- **Action Buttons**: Row of 3 circular buttons below card stack

---

## Interaction Design

| Action | Animation | Haptic |
|--------|-----------|--------|
| Swipe right | Card rotates + flies right, heart overlay fades in | `ImpactFeedbackStyle.Medium` |
| Swipe left | Card rotates + flies left, X overlay fades in | `ImpactFeedbackStyle.Light` |
| Super like | Card flies up, star overlay | `NotificationFeedbackType.Success` |
| Like button tap | Scale bounce on button | `ImpactFeedbackStyle.Medium` |
| Match saved | Brief success toast at top | `NotificationFeedbackType.Success` |

---

## Data Architecture

### Restaurant Card Model
```ts
type Restaurant = {
  id: string;
  name: string;
  cuisine: string[];
  rating: number;       // 0-5
  reviewCount: number;
  priceLevel: 1 | 2 | 3 | 4;  // $ to $$$$
  distance: number;     // km
  imageUrl: string;
  address: string;
  isOpen: boolean;
  openingHours?: string;
  lat: number;
  lng: number;
};
```

### Data Source
- **Primary**: Google Places API (Nearby Search) — requires API key from user
- **Fallback**: Curated mock dataset of 30+ restaurants with real food photos from Unsplash

### State Management
- `useSwipeStore` (React Context + useReducer): card stack, liked list, filters, location
- `AsyncStorage`: persist liked restaurants across sessions
