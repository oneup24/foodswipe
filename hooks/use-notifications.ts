import { useCallback } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const RE_ENGAGEMENT_ID_KEY = "@foodswipe_reengagement_id";

// Lazy-import expo-notifications only on native to avoid web bundling issues
async function getNotifications() {
  if (Platform.OS === "web") return null;
  return await import("expo-notifications");
}

export async function setupNotifications(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  const Notifications = await getNotifications();
  if (!Notifications) return false;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return false;

  // Configure notification handler
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  // Cancel existing scheduled notifications and reschedule
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Daily 6pm reminder
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "FoodSwipe",
      body: "🍜 Ready to discover new restaurants nearby?",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 18,
      minute: 0,
    },
  });

  return true;
}

export function useNotifications() {
  const scheduleReEngagement = useCallback(async (likedCount: number) => {
    if (Platform.OS === "web") return;
    const Notifications = await getNotifications();
    if (!Notifications) return;

    // Cancel existing re-engagement notification
    const existing = await AsyncStorage.getItem(RE_ENGAGEMENT_ID_KEY);
    if (existing) await Notifications.cancelScheduledNotificationAsync(existing);

    const body =
      likedCount > 0
        ? `👀 You have ${likedCount} saved spot${likedCount > 1 ? "s" : ""} waiting for you!`
        : "👀 New restaurants are waiting — come back and discover!";

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "FoodSwipe misses you",
        body,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 48 * 60 * 60, // 48 hours
        repeats: false,
      },
    });

    await AsyncStorage.setItem(RE_ENGAGEMENT_ID_KEY, id);
  }, []);

  const cancelReEngagement = useCallback(async () => {
    if (Platform.OS === "web") return;
    const Notifications = await getNotifications();
    if (!Notifications) return;

    const id = await AsyncStorage.getItem(RE_ENGAGEMENT_ID_KEY);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id);
      await AsyncStorage.removeItem(RE_ENGAGEMENT_ID_KEY);
    }
  }, []);

  return { scheduleReEngagement, cancelReEngagement };
}
