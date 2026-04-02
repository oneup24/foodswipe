import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Dimensions,
  Alert,
  AlertButton,
  Share,
  Modal,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { SaveToListModal } from "@/components/save-to-list-modal";
import { useSwipe } from "@/lib/swipe-context";
import { useLists } from "@/lib/lists-context";
import { useColors } from "@/hooks/use-colors";
import { useLanguage } from "@/hooks/use-language";
import { Restaurant, PlannedVisit } from "@/lib/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.3;
const PLANS_KEY = "@foodswipe_plans";

async function getNotifications() {
  if (Platform.OS === "web") return null;
  return await import("expo-notifications");
}

function getQuickPickTimes(): { label: string; sublabel: string; date: Date }[] {
  const now = new Date();
  const today = new Date(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Next Saturday
  const sat = new Date(now);
  const daysUntilSat = (6 - now.getDay() + 7) % 7 || 7;
  sat.setDate(sat.getDate() + daysUntilSat);

  const todayLunch = new Date(today); todayLunch.setHours(12, 0, 0, 0);
  const todayDinner = new Date(today); todayDinner.setHours(19, 0, 0, 0);
  const tomorrowLunch = new Date(tomorrow); tomorrowLunch.setHours(12, 0, 0, 0);
  const tomorrowDinner = new Date(tomorrow); tomorrowDinner.setHours(19, 0, 0, 0);
  const satDinner = new Date(sat); satDinner.setHours(19, 0, 0, 0);

  return [
    { label: "Today", sublabel: "Lunch · 12pm", date: todayLunch },
    { label: "Today", sublabel: "Dinner · 7pm", date: todayDinner },
    { label: "Tomorrow", sublabel: "Lunch · 12pm", date: tomorrowLunch },
    { label: "Tomorrow", sublabel: "Dinner · 7pm", date: tomorrowDinner },
    { label: "This Weekend", sublabel: "Sat · Dinner · 7pm", date: satDinner },
  ].filter((pick) => pick.date > now);
}

function RestaurantCard({
  restaurant,
  onPress,
  onUnlike,
  isPlanned,
  onPlan,
  onCancelPlan,
  onSaveToList,
}: {
  restaurant: Restaurant;
  onPress: (r: Restaurant) => void;
  onUnlike: (id: string) => void;
  isPlanned: boolean;
  onPlan: (r: Restaurant) => void;
  onCancelPlan: (id: string) => void;
  onSaveToList: (r: Restaurant) => void;
}) {
  const colors = useColors();
  const { t, currentLanguage } = useLanguage();

  const handleLongPress = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const displayName = restaurant.nameLocalized?.[currentLanguage] || restaurant.name;
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name)}&query_place_id=${restaurant.id}`;
    const options: AlertButton[] = [
      { text: "Cancel", style: "cancel" },
      {
        text: "Share",
        onPress: () =>
          Share.share({
            title: displayName,
            message: `${displayName}\n${restaurant.cuisine.join(" · ")} · ${"$".repeat(restaurant.priceLevel)}\nRating: ${restaurant.rating}/5 · ${restaurant.distance.toFixed(1)}km away\n${restaurant.address}\n\n${mapsUrl}`,
          }),
      },
      {
        text: "Save to List",
        onPress: () => onSaveToList(restaurant),
      },
    ];
    if (isPlanned) {
      options.push({
        text: "Cancel Plan",
        style: "destructive",
        onPress: () => onCancelPlan(restaurant.id),
      });
    }
    options.push({
      text: "Remove",
      style: "destructive",
      onPress: () => onUnlike(restaurant.id),
    });
    Alert.alert(
      displayName,
      `${restaurant.cuisine[0] ?? "Restaurant"} · ${"$".repeat(restaurant.priceLevel)} · ${restaurant.rating}/5`,
      options
    );
  }, [restaurant, onUnlike, isPlanned, onCancelPlan, onSaveToList, currentLanguage]);

  return (
    <Pressable
      accessibilityLabel={restaurant.name}
      accessibilityRole="button"
      onPress={() => onPress(restaurant)}
      onLongPress={handleLongPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          shadowColor: colors.foreground,
        },
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
        <Text style={styles.cardName} numberOfLines={1}>
          {restaurant.nameLocalized?.[currentLanguage] || restaurant.name}
        </Text>
        <Text style={styles.cardCuisine} numberOfLines={1}>
          {(() => {
            const key = restaurant.cuisine[0]?.toLowerCase().replace(/\s+/g, '');
            return t(`cuisines.${key}`) || restaurant.cuisine[0];
          })()}
        </Text>
        <View style={styles.cardMeta}>
          <Text style={styles.cardStar}>★</Text>
          <Text style={styles.cardRating}>{restaurant.rating.toFixed(1)}</Text>
          <Text style={styles.cardDot}>·</Text>
          <Text style={styles.cardPrice}>{"$".repeat(restaurant.priceLevel)}</Text>
        </View>

        {/* Plan button / Planned badge */}
        <View style={styles.badgeRow}>
          {isPlanned ? (
            <View style={styles.plannedBadge}>
              <Text style={styles.plannedBadgeText}>📅 Planned</Text>
            </View>
          ) : (
            <Pressable
              onPress={(e) => { e.stopPropagation?.(); onPlan(restaurant); }}
              style={({ pressed }) => [styles.planBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.planBtnText}>📅 Plan</Text>
            </Pressable>
          )}
          <Pressable
            onPress={(e) => { e.stopPropagation?.(); onSaveToList(restaurant); }}
            style={({ pressed }) => [styles.listBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.listBtnText}>📋</Text>
          </Pressable>
        </View>
      </View>

      {/* Open/Closed indicator */}
      <View
        style={[
          styles.openDot,
          { backgroundColor: restaurant.isOpen ? "#34C759" : "#FF3B30" },
        ]}
      />

      {/* More actions button */}
      <Pressable
        onPress={(e) => { e.stopPropagation?.(); handleLongPress(); }}
        style={({ pressed }) => [styles.moreBtn, pressed && { opacity: 0.7 }]}
        hitSlop={8}
      >
        <Text style={styles.moreBtnText}>⋯</Text>
      </Pressable>
    </Pressable>
  );
}

export default function LikedScreen() {
  const { state, unlike } = useSwipe();
  const colors = useColors();
  const { t } = useLanguage();
  const router = useRouter();
  const { removeRestaurantFromAll } = useLists();
  const [plans, setPlans] = useState<PlannedVisit[]>([]);
  const [planningRestaurant, setPlanningRestaurant] = useState<Restaurant | null>(null);
  const [savingToListRestaurant, setSavingToListRestaurant] = useState<Restaurant | null>(null);
  const [query, setQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"recent" | "rating" | "name">("recent");

  const displayedRestaurants = useMemo(() => {
    let list = [...state.likedRestaurants];
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(q));
    }
    if (sortOrder === "rating") list.sort((a, b) => b.rating - a.rating);
    if (sortOrder === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [state.likedRestaurants, query, sortOrder]);

  // Load saved plans on mount
  useEffect(() => {
    AsyncStorage.getItem(PLANS_KEY).then((data) => {
      if (data) {
        try { setPlans(JSON.parse(data) as PlannedVisit[]); } catch {}
      }
    });
  }, []);

  const savePlans = useCallback((updated: PlannedVisit[]) => {
    setPlans(updated);
    AsyncStorage.setItem(PLANS_KEY, JSON.stringify(updated));
  }, []);

  const handlePlanPick = useCallback(async (restaurant: Restaurant, date: Date) => {
    const Notifications = await getNotifications();
    let notificationId = "";

    if (Notifications && date > new Date()) {
      notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: t("plan.reminderTitle"),
          body: restaurant.nameLocalized?.["en"] || restaurant.name,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
        },
      });
    }

    const newPlan: PlannedVisit = {
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      notificationId,
      timestamp: date.getTime(),
    };
    savePlans([...plans.filter((p) => p.restaurantId !== restaurant.id), newPlan]);
    setPlanningRestaurant(null);
  }, [plans, savePlans, t]);

  const handleCancelPlan = useCallback(async (restaurantId: string) => {
    const plan = plans.find((p) => p.restaurantId === restaurantId);
    if (plan?.notificationId) {
      const Notifications = await getNotifications();
      if (Notifications) {
        await Notifications.cancelScheduledNotificationAsync(plan.notificationId).catch(() => {});
      }
    }
    savePlans(plans.filter((p) => p.restaurantId !== restaurantId));
  }, [plans, savePlans]);

  const handlePrivacy = useCallback(() => {
    router.push("/privacy-policy");
  }, [router]);

  const handlePress = useCallback(
    (restaurant: Restaurant) => {
      router.push({
        pathname: "/restaurant-detail",
        params: { id: restaurant.id },
      });
    },
    [router]
  );

  const handleUnlike = useCallback(
    (id: string) => {
      unlike(id);
      handleCancelPlan(id);
      removeRestaurantFromAll(id);
    },
    [unlike, handleCancelPlan, removeRestaurantFromAll]
  );

  const renderItem = useCallback(
    ({ item }: { item: Restaurant }) => (
      <RestaurantCard
        restaurant={item}
        onPress={handlePress}
        onUnlike={handleUnlike}
        isPlanned={plans.some((p) => p.restaurantId === item.id)}
        onPlan={setPlanningRestaurant}
        onCancelPlan={handleCancelPlan}
        onSaveToList={setSavingToListRestaurant}
      />
    ),
    [handlePress, handleUnlike, plans, handleCancelPlan]
  );

  const quickPicks = planningRestaurant ? getQuickPickTimes() : [];

  return (
    <ScreenContainer containerClassName="bg-background" className="flex-1">
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {t('common.liked')}
          </Text>
          {state.likedRestaurants.length > 0 && (
            <View style={[styles.countBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.countText}>{state.likedRestaurants.length}</Text>
            </View>
          )}
        </View>
        {state.likedRestaurants.length > 0 && (
          <Text style={[styles.headerSub, { color: colors.muted }]}>{displayedRestaurants.length} saved</Text>
        )}
      </View>

      {state.likedRestaurants.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>💔</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No liked restaurants yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            Swipe right or tap the heart button on the Discover tab to save your favorites here.
          </Text>
          <Pressable
            onPress={() => router.push("/")}
            style={({ pressed }) => [
              styles.discoverButton,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.8 },
            ]}
          >
            <IconSymbol name="fork.knife" size={16} color="#fff" />
            <Text style={styles.discoverButtonText}>Start Discovering</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* Search */}
          <View style={[styles.searchRow, { borderBottomColor: colors.border }]}>
            <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.searchIcon, { color: colors.muted }]}>🔍</Text>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search saved restaurants…"
                placeholderTextColor={colors.muted}
                style={[styles.searchInput, { color: colors.foreground }]}
                clearButtonMode="while-editing"
              />
            </View>
          </View>
          {/* Sort chips */}
          <View style={[styles.sortRow, { borderBottomColor: colors.border }]}>
            {(["recent", "rating", "name"] as const).map((s) => (
              <Pressable
                key={s}
                onPress={() => setSortOrder(s)}
                style={[
                  styles.sortChip,
                  { borderColor: colors.border },
                  sortOrder === s && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
              >
                <Text style={[styles.sortChipText, { color: sortOrder === s ? "#fff" : colors.muted }]}>
                  {s === "recent" ? "Recent" : s === "rating" ? "Rating ↓" : "A–Z"}
                </Text>
              </Pressable>
            ))}
          </View>
          <FlatList
            data={displayedRestaurants}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.row}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}

      {/* Privacy Policy link */}
      <Pressable
        onPress={handlePrivacy}
        style={({ pressed }) => [styles.privacyLink, pressed && { opacity: 0.5 }]}
      >
        <Text style={[styles.privacyText, { color: colors.muted }]}>Privacy Policy</Text>
      </Pressable>

      {/* Save to List Modal */}
      {savingToListRestaurant && (
        <SaveToListModal
          visible={!!savingToListRestaurant}
          restaurantId={savingToListRestaurant.id}
          restaurantName={savingToListRestaurant.name}
          onClose={() => setSavingToListRestaurant(null)}
        />
      )}

      {/* Plan a Visit Modal */}
      <Modal
        visible={!!planningRestaurant}
        transparent
        animationType="slide"
        onRequestClose={() => setPlanningRestaurant(null)}
      >
        <Pressable style={styles.planOverlay} onPress={() => setPlanningRestaurant(null)}>
          <Pressable style={[styles.planSheet, { backgroundColor: colors.surface }]} onPress={() => {}}>
            <Text style={[styles.planTitle, { color: colors.foreground }]}>
              📅 {t("plan.title")}
            </Text>
            {planningRestaurant && (
              <Text style={[styles.planRestaurantName, { color: colors.muted }]} numberOfLines={1}>
                {planningRestaurant.name}
              </Text>
            )}
            <View style={styles.planOptions}>
              {quickPicks.map((pick, i) => (
                <Pressable
                  key={i}
                  onPress={() => planningRestaurant && handlePlanPick(planningRestaurant, pick.date)}
                  style={({ pressed }) => [
                    styles.planOption,
                    { borderColor: colors.border, backgroundColor: colors.background },
                    pressed && { backgroundColor: colors.surface, opacity: 0.8 },
                  ]}
                >
                  <Text style={[styles.planOptionLabel, { color: colors.foreground }]}>{pick.label}</Text>
                  <Text style={[styles.planOptionSublabel, { color: colors.muted }]}>{pick.sublabel}</Text>
                </Pressable>
              ))}
              {quickPicks.length === 0 && (
                <Text style={[styles.planOptionLabel, { color: colors.muted, textAlign: "center" }]}>
                  No upcoming times available today. Try tomorrow!
                </Text>
              )}
            </View>
            <Pressable onPress={() => setPlanningRestaurant(null)} style={styles.planCancelBtn}>
              <Text style={[styles.planCancelText, { color: colors.muted }]}>{t("common.cancel")}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
  },
  headerSub: {
    fontSize: 12,
    fontWeight: "500",
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  countText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  grid: {
    padding: 16,
    paddingBottom: 32,
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
    height: "60%",
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
  cardStar: {
    color: "#FFD60A",
    fontSize: 11,
  },
  cardRating: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  cardDot: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
  },
  cardPrice: {
    color: "#FFD60A",
    fontSize: 11,
    fontWeight: "600",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    flexWrap: "wrap",
  },
  planBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  listBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  listBtnText: {
    fontSize: 11,
  },
  planBtnText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  plannedBadge: {
    backgroundColor: "#34C75930",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#34C759",
  },
  plannedBadgeText: {
    color: "#34C759",
    fontSize: 10,
    fontWeight: "700",
  },
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
  moreBtn: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  moreBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  discoverButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 8,
  },
  discoverButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  privacyLink: {
    alignItems: "center",
    paddingVertical: 12,
  },
  privacyText: {
    fontSize: 12,
    textDecorationLine: "underline",
  },
  // Plan modal
  planOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  planSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 8,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 4,
  },
  planRestaurantName: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 8,
  },
  planOptions: {
    gap: 8,
  },
  planOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  planOptionLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  planOptionSublabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  planCancelBtn: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 4,
  },
  planCancelText: {
    fontSize: 15,
    fontWeight: "600",
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchIcon: {
    fontSize: 15,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  sortRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  sortChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
