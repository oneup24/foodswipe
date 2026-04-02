import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Dimensions,
  Alert,
  Share,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useLists } from "@/lib/lists-context";
import { useSwipe } from "@/lib/swipe-context";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";
import { Restaurant } from "@/lib/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.3;

function RestaurantCard({
  restaurant,
  onPress,
  onRemove,
}: {
  restaurant: Restaurant;
  onPress: () => void;
  onRemove: () => void;
}) {
  const colors = useColors();

  const handleLongPress = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name)}&query_place_id=${restaurant.id}`;
    Alert.alert(restaurant.name, `${restaurant.cuisine[0] ?? "Restaurant"} · ${"$".repeat(restaurant.priceLevel)} · ${restaurant.rating}/5`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Share",
        onPress: () =>
          Share.share({
            title: restaurant.name,
            message: `${restaurant.name}\n${restaurant.cuisine.join(" · ")} · ${"$".repeat(restaurant.priceLevel)}\nRating: ${restaurant.rating}/5\n${restaurant.address}\n\n${mapsUrl}`,
          }),
      },
      { text: "Remove from List", style: "destructive", onPress: onRemove },
    ]);
  }, [restaurant, onRemove]);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={handleLongPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, shadowColor: colors.foreground },
        pressed && { opacity: 0.85 },
      ]}
    >
      <Image
        source={{ uri: restaurant.photos?.[0] ?? restaurant.imageUrl }}
        style={styles.cardImage}
        contentFit="cover"
        transition={200}
      />
      <View style={styles.cardOverlay} />
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>{restaurant.name}</Text>
        <Text style={styles.cardCuisine} numberOfLines={1}>{restaurant.cuisine[0]}</Text>
        <View style={styles.cardMeta}>
          <Text style={styles.cardStar}>★</Text>
          <Text style={styles.cardRating}>{restaurant.rating.toFixed(1)}</Text>
          <Text style={styles.cardDot}>·</Text>
          <Text style={styles.cardPrice}>{"$".repeat(restaurant.priceLevel)}</Text>
        </View>
      </View>
      <View style={[styles.openDot, { backgroundColor: restaurant.isOpen ? "#34C759" : "#FF3B30" }]} />
    </Pressable>
  );
}

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { lists, removeFromList, setShareToken } = useLists();
  const { state } = useSwipe();
  const shareMutation = trpc.list.share.useMutation();
  const [isSharing, setIsSharing] = useState(false);

  const list = lists.find((l) => l.id === id);

  const restaurants = list
    ? (list.restaurantIds
        .map((rid) => state.likedRestaurants.find((r) => r.id === rid) ?? state.allRestaurants.find((r) => r.id === rid))
        .filter(Boolean) as Restaurant[])
    : [];

  const handleRemove = useCallback(
    (restaurantId: string) => {
      if (!list) return;
      removeFromList(list.id, restaurantId);
    },
    [list, removeFromList]
  );

  const handleShare = useCallback(async () => {
    if (!list) return;
    setIsSharing(true);
    try {
      let url: string;
      if (list.shareToken) {
        url = list.shareToken;
      } else {
        const result = await shareMutation.mutateAsync({
          name: list.name,
          emoji: list.emoji,
          description: list.description,
          restaurants: restaurants.map((r) => ({
            id: r.id,
            name: r.name,
            cuisine: r.cuisine,
            rating: r.rating,
            priceLevel: r.priceLevel,
            imageUrl: r.imageUrl,
            address: r.address,
          })),
        });
        url = result.url;
        setShareToken(list.id, result.url);
      }
      await Share.share({
        title: `${list.emoji} ${list.name}`,
        message: `Check out my FoodSwipe list "${list.name}"! ${url}`,
        url,
      });
    } catch {
      Alert.alert("Couldn't share", "Please try again.");
    } finally {
      setIsSharing(false);
    }
  }, [list, restaurants, shareMutation, setShareToken]);

  const renderItem = useCallback(
    ({ item }: { item: Restaurant }) => (
      <RestaurantCard
        restaurant={item}
        onPress={() => router.push({ pathname: "/restaurant-detail", params: { id: item.id } })}
        onRemove={() => handleRemove(item.id)}
      />
    ),
    [router, handleRemove]
  );

  if (!list) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { top: insets.top + 12 }]}>
          <IconSymbol name="chevron.left" size={20} color={colors.foreground} />
        </Pressable>
        <View style={styles.empty}>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>List not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn2}>
          <IconSymbol name="chevron.left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerEmoji}>{list.emoji}</Text>
          <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>{list.name}</Text>
        </View>
        <Pressable
          onPress={handleShare}
          hitSlop={12}
          style={styles.backBtn2}
          disabled={isSharing}
          accessibilityLabel="Share list"
          accessibilityRole="button"
        >
          {isSharing
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <IconSymbol name="square.and.arrow.up" size={22} color={colors.primary} />}
        </Pressable>
      </View>

      {restaurants.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>{list.emoji}</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No places yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            Tap the bookmark icon on any restaurant to add it here.
          </Text>
        </View>
      ) : (
        <>
          <Text style={[styles.hintText, { color: colors.muted }]}>
            Long press to remove · Tap to view details
          </Text>
          <FlatList
            data={restaurants}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.row}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  headerEmoji: { fontSize: 22 },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    maxWidth: "70%",
  },
  backBtn: {
    position: "absolute",
    left: 16,
    zIndex: 10,
    padding: 8,
  },
  backBtn2: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  hintText: {
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 8,
  },
  grid: {
    padding: 16,
    paddingBottom: 40,
  },
  row: {
    gap: 16,
    marginBottom: 16,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  cardOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "55%",
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  cardInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
  },
  cardName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 18,
  },
  cardCuisine: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
    marginTop: 2,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 4,
  },
  cardStar: { color: "#FFD60A", fontSize: 11 },
  cardRating: { color: "#fff", fontSize: 11, fontWeight: "700" },
  cardDot: { color: "rgba(255,255,255,0.5)", fontSize: 11 },
  cardPrice: { color: "#FFD60A", fontSize: 11, fontWeight: "600" },
  openDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyEmoji: { fontSize: 56, marginBottom: 4 },
  emptyTitle: { fontSize: 20, fontWeight: "800", textAlign: "center" },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
