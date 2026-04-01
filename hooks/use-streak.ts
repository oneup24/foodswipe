import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STREAK_COUNT_KEY = "@foodswipe_streak_count";
const STREAK_DATE_KEY = "@foodswipe_streak_last_date";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function useStreak() {
  const [streakCount, setStreakCount] = useState(0);

  useEffect(() => {
    AsyncStorage.multiGet([STREAK_COUNT_KEY, STREAK_DATE_KEY]).then(([countEntry, dateEntry]) => {
      const count = parseInt(countEntry[1] ?? "0", 10) || 0;
      const lastDate = dateEntry[1] ?? "";
      const today = todayISO();
      if (lastDate === today) {
        setStreakCount(count);
      } else if (lastDate === yesterdayISO()) {
        // Streak still alive — don't increment yet, just show current count
        setStreakCount(count);
      } else if (lastDate) {
        // Gap — streak broken, reset
        setStreakCount(0);
        AsyncStorage.multiSet([[STREAK_COUNT_KEY, "0"], [STREAK_DATE_KEY, ""]]);
      }
    });
  }, []);

  const incrementStreak = useCallback(async () => {
    const today = todayISO();
    const [[, countStr], [, lastDate]] = await AsyncStorage.multiGet([STREAK_COUNT_KEY, STREAK_DATE_KEY]);
    const count = parseInt(countStr ?? "0", 10) || 0;

    if (lastDate === today) return; // Already incremented today

    let newCount: number;
    if (lastDate === yesterdayISO() || count === 0) {
      newCount = count + 1;
    } else {
      newCount = 1; // Gap — reset
    }

    await AsyncStorage.multiSet([
      [STREAK_COUNT_KEY, String(newCount)],
      [STREAK_DATE_KEY, today],
    ]);
    setStreakCount(newCount);
  }, []);

  return { streakCount, incrementStreak };
}
