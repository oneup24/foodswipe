import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useLists } from "@/lib/lists-context";
import { useSwipe } from "@/lib/swipe-context";
import { UserList } from "@/lib/types";

const PRESET_EMOJIS = ["📅", "💑", "👨‍👩‍👧", "💼", "💰", "🍜", "🌮", "🍣", "🥂", "🗾", "🏖️", "🎉", "⭐", "❤️", "🔥"];

interface SaveToListModalProps {
  visible: boolean;
  restaurantId: string;
  restaurantName: string;
  onClose: () => void;
}

export function SaveToListModal({ visible, restaurantId, restaurantName, onClose }: SaveToListModalProps) {
  const colors = useColors();
  const { lists, addToList, removeFromList, createList, listsForRestaurant } = useLists();
  const { state, swipeRight } = useSwipe();

  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("📋");

  const inLists = listsForRestaurant(restaurantId);
  const inListIds = new Set(inLists.map((l) => l.id));

  const toggleList = useCallback(
    (list: UserList) => {
      if (inListIds.has(list.id)) {
        removeFromList(list.id, restaurantId);
      } else {
        addToList(list.id, restaurantId);
        // Saving to any list implicitly likes the restaurant
        const isAlreadyLiked = state.likedRestaurants.some((r) => r.id === restaurantId);
        if (!isAlreadyLiked) {
          const restaurant = state.allRestaurants.find((r) => r.id === restaurantId)
            ?? state.likedRestaurants.find((r) => r.id === restaurantId);
          if (restaurant) swipeRight(restaurant);
        }
      }
    },
    [inListIds, addToList, removeFromList, restaurantId, state, swipeRight]
  );

  const handleCreate = useCallback(() => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    createList(trimmed, newEmoji);
    setNewName("");
    setNewEmoji("📋");
    setCreatingNew(false);
  }, [newName, newEmoji, createList]);

  const handleClose = useCallback(() => {
    setCreatingNew(false);
    setNewName("");
    setNewEmoji("📋");
    onClose();
  }, [onClose]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={() => {}}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>Save to List</Text>
            <Pressable onPress={handleClose} hitSlop={12}>
              <Text style={[styles.closeText, { color: colors.muted }]}>✕</Text>
            </Pressable>
          </View>
          <Text style={[styles.subtitle, { color: colors.muted }]} numberOfLines={1}>
            {restaurantName}
          </Text>

          {/* Lists */}
          <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
            {[...lists].sort((a, b) => b.createdAt - a.createdAt).map((list) => {
              const checked = inListIds.has(list.id);
              return (
                <Pressable
                  key={list.id}
                  onPress={() => toggleList(list)}
                  style={({ pressed }) => [
                    styles.listRow,
                    { borderColor: colors.border },
                    checked && { borderColor: colors.primary, backgroundColor: colors.primary + "10" },
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  <Text style={styles.listEmoji}>{list.emoji}</Text>
                  <View style={styles.listInfo}>
                    <Text style={[styles.listName, { color: colors.foreground }]}>{list.name}</Text>
                    <Text style={[styles.listCount, { color: colors.muted }]}>
                      {list.restaurantIds.length} {list.restaurantIds.length === 1 ? "place" : "places"}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.checkbox,
                      { borderColor: checked ? colors.primary : colors.border },
                      checked && { backgroundColor: colors.primary },
                    ]}
                  >
                    {checked && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Create new list */}
          {creatingNew ? (
            <View style={styles.createForm}>
              {/* Emoji picker */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiRow}>
                {PRESET_EMOJIS.map((e) => (
                  <Pressable
                    key={e}
                    onPress={() => setNewEmoji(e)}
                    style={[styles.emojiBtn, newEmoji === e && { backgroundColor: colors.primary + "20", borderColor: colors.primary }]}
                  >
                    <Text style={styles.emojiText}>{e}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="List name…"
                placeholderTextColor={colors.muted}
                style={[styles.nameInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                autoFocus
                maxLength={30}
                onSubmitEditing={handleCreate}
                returnKeyType="done"
              />
              <View style={styles.createActions}>
                <Pressable
                  onPress={() => { setCreatingNew(false); setNewName(""); }}
                  style={[styles.cancelCreateBtn, { borderColor: colors.border }]}
                >
                  <Text style={[styles.cancelCreateText, { color: colors.muted }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleCreate}
                  disabled={!newName.trim()}
                  style={[styles.confirmCreateBtn, { backgroundColor: colors.primary }, !newName.trim() && { opacity: 0.5 }]}
                >
                  <Text style={styles.confirmCreateText}>Create</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={() => setCreatingNew(true)}
              style={({ pressed }) => [styles.newListBtn, { borderColor: colors.border }, pressed && { opacity: 0.7 }]}
            >
              <Text style={[styles.newListText, { color: colors.primary }]}>+ Create new list</Text>
            </Pressable>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
  },
  closeText: {
    fontSize: 18,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  listScroll: {
    maxHeight: 280,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 8,
    gap: 12,
  },
  listEmoji: {
    fontSize: 24,
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    fontSize: 15,
    fontWeight: "700",
  },
  listCount: {
    fontSize: 12,
    marginTop: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmark: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
  },
  newListBtn: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
  },
  newListText: {
    fontSize: 15,
    fontWeight: "700",
  },
  createForm: {
    marginTop: 12,
    gap: 10,
  },
  emojiRow: {
    flexDirection: "row",
  },
  emojiBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  emojiText: {
    fontSize: 22,
  },
  nameInput: {
    fontSize: 16,
    fontWeight: "600",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  createActions: {
    flexDirection: "row",
    gap: 10,
  },
  cancelCreateBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
  },
  cancelCreateText: {
    fontSize: 15,
    fontWeight: "600",
  },
  confirmCreateBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  confirmCreateText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
