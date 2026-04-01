import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface StreakBadgeProps {
  count: number;
}

export function StreakBadge({ count }: StreakBadgeProps) {
  if (count === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.flame}>🔥</Text>
      <Text style={styles.count}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(255,149,0,0.15)",
  },
  flame: {
    fontSize: 14,
  },
  count: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FF9500",
  },
});
