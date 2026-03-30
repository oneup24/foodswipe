// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 */
const MAPPING = {
  // Navigation
  "house.fill": "home",
  "heart.fill": "favorite",
  "heart": "favorite-border",
  "xmark": "close",
  "xmark.circle.fill": "cancel",
  "star.fill": "star",
  "star": "star-border",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "chevron.down": "expand-more",
  "chevron.up": "expand-less",
  // Food & Restaurant
  "fork.knife": "restaurant",
  "fork.knife.circle.fill": "restaurant",
  "location.fill": "location-on",
  "location": "location-on",
  "map.fill": "map",
  "magnifyingglass": "search",
  "slider.horizontal.3": "tune",
  "line.3.horizontal.decrease.circle": "filter-list",
  "arrow.counterclockwise": "refresh",
  "square.grid.2x2.fill": "grid-view",
  "list.bullet": "list",
  "info.circle": "info",
  "info.circle.fill": "info",
  "square.and.arrow.up": "share",
  "arrow.up": "arrow-upward",
  "clock": "access-time",
  "clock.fill": "access-time",
  "dollarsign.circle": "attach-money",
  "mappin.and.ellipse": "place",
  "person.2.fill": "people",
  "flame.fill": "local-fire-department",
  "bolt.fill": "bolt",
  "checkmark.circle.fill": "check-circle",
  "trash.fill": "delete",
  "gearshape.fill": "settings",
  "arrow.left": "arrow-back",
} as unknown as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
