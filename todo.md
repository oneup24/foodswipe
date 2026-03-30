# FoodSwipe TODO

## Setup & Configuration
- [x] Update theme colors (red/teal brand palette)
- [x] Add icon mappings for all tabs and UI icons
- [x] Install expo-location dependency
- [x] Configure app.config.ts with FoodSwipe branding

## Core Data Layer
- [x] Define Restaurant type and mock data (25 restaurants)
- [x] Create SwipeContext (card stack, liked list, filters, location)
- [x] Persist liked restaurants with AsyncStorage
- [ ] Implement Google Places API integration (with fallback to mock data)

## Discover Screen (Home Tab)
- [x] Location bar at top (shows city, tap to change)
- [x] Filter icon button (top right)
- [x] Swipeable card stack (react-native-gesture-handler)
- [x] Card design: hero image, name, cuisine, rating, distance, price
- [x] Swipe right = like (heart overlay, flies right)
- [x] Swipe left = pass (X overlay, flies left)
- [x] Swipe up = super like (star overlay, flies up)
- [x] Action buttons row (Pass, Super Like, Like)
- [x] Haptic feedback on swipe actions
- [x] Empty state when no more cards
- [x] Auto-load more cards when stack runs low (reset button)

## Liked Screen (Matches Tab)
- [x] 2-column grid of liked restaurants
- [x] Restaurant card with thumbnail, name, cuisine, rating
- [x] Tap card → Restaurant Detail sheet
- [x] Empty state illustration + message
- [x] Unlike/remove from liked (long press)

## Restaurant Detail Sheet
- [x] Full-screen modal screen
- [x] Hero image (large)
- [x] Name, cuisine, rating, review count
- [x] Address + distance
- [x] Price range indicator
- [x] Opening hours
- [x] Like/Pass action buttons
- [x] Share button

## Filters Bottom Sheet
- [x] Cuisine type multi-select chips
- [x] Price range selector ($ to $$$$)
- [x] Distance radius selector (1–20km)
- [x] Minimum rating selector
- [x] Open now toggle
- [x] Apply Filters button
- [x] Reset Filters button

## Location Picker Modal
- [x] Search input for city/address
- [x] "Use My Location" button (expo-location)
- [x] Preset cities list (20 world cities)
- [x] Geocoding city name to lat/lng

## Branding & Polish
- [x] Generate custom app icon/logo
- [x] Update splash screen
- [x] Swipe card rotation animation
- [x] Card overlay (heart/X) fade-in animation
- [x] Button press animations
- [x] Success toast on like
- [x] Tab bar with liked count badge
- [x] Filter active indicator dot
