import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { useLists } from "@/lib/lists-context";
import { useSwipe } from "@/lib/swipe-context";
import { useColors } from "@/hooks/use-colors";
import { UserList } from "@/lib/types";

const PRESET_EMOJIS = ["📅", "💑", "👨‍👩‍👧", "💼", "💰", "🍜", "🌮", "🍣", "🥂", "🗾", "🏖️", "🎉", "⭐", "❤️", "🔥"];

function ListCard({ list, onPress, onLongPress, previewUrls }: { list: UserList; onPress: () => void; onLongPress: () => void; previewUrls: string[] }) {
  const colors = useColors();
  const hasPhotos = previewUrls.length > 0;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.foreground },
        pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
      ]}
    >
      {hasPhotos ? (
        <>
          <View style={styles.photoStrip}>
            {previewUrls.slice(0, 3).map((url, i) => (
              <Image key={i} source={{ uri: url }} style={styles.photoCell} contentFit="cover" />
            ))}
            <View style={styles.photoStripOverlay} />
            <Text style={styles.photoEmoji}>{list.emoji}</Text>
          </View>
          <View style={styles.cardTextPadded}>
            <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={1}>{list.name}</Text>
            <Text style={[styles.cardCount, { color: colors.muted }]}>
              {list.restaurantIds.length} {list.restaurantIds.length === 1 ? "place" : "places"}
            </Text>
          </View>
        </>
      ) : (
        <View style={styles.cardContent}>
          <Text style={styles.cardEmoji}>{list.emoji}</Text>
          <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={2}>{list.name}</Text>
          <Text style={[styles.cardCount, { color: colors.muted }]}>
            {list.restaurantIds.length} {list.restaurantIds.length === 1 ? "place" : "places"}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export default function ListsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { lists, createList, deleteList, renameList } = useLists();
  const { state: swipeState } = useSwipe();

  const [showCreate, setShowCreate] = useState(false);
  const [editingList, setEditingList] = useState<UserList | null>(null);
  const [formName, setFormName] = useState("");
  const [formEmoji, setFormEmoji] = useState("📋");
  const [descInput, setDescInput] = useState("");

  const openCreate = useCallback(() => {
    setFormName("");
    setFormEmoji("📋");
    setDescInput("");
    setShowCreate(true);
  }, []);

  const handleCreate = useCallback(() => {
    const trimmed = formName.trim();
    if (!trimmed) return;
    createList(trimmed, formEmoji, descInput.trim() || undefined);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowCreate(false);
    setDescInput("");
  }, [formName, formEmoji, descInput, createList]);

  const openEdit = useCallback((list: UserList) => {
    setEditingList(list);
    setFormName(list.name);
    setFormEmoji(list.emoji);
  }, []);

  const handleRename = useCallback(() => {
    if (!editingList || !formName.trim()) return;
    renameList(editingList.id, formName.trim(), formEmoji);
    setEditingList(null);
  }, [editingList, formName, formEmoji, renameList]);

  const handleLongPress = useCallback((list: UserList) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const options: { text: string; style?: "cancel" | "destructive"; onPress?: () => void }[] = [
      { text: "Cancel", style: "cancel" },
      { text: "Rename", onPress: () => openEdit(list) },
    ];
    if (!list.isDefault) {
      options.push({
        text: "Delete List",
        style: "destructive",
        onPress: () =>
          Alert.alert("Delete List", `Delete "${list.name}"? This won't remove the restaurants.`, [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => deleteList(list.id) },
          ]),
      });
    }
    Alert.alert(list.name, `${list.restaurantIds.length} saved places`, options);
  }, [openEdit, deleteList]);

  const renderItem = useCallback(
    ({ item }: { item: UserList }) => {
      const previewUrls = item.restaurantIds
        .slice(0, 3)
        .map((id) => swipeState.likedRestaurants.find((r) => r.id === id)?.imageUrl)
        .filter((url): url is string => !!url);
      return (
        <ListCard
          list={item}
          onPress={() => router.push({ pathname: "/list-detail", params: { id: item.id } })}
          onLongPress={() => handleLongPress(item)}
          previewUrls={previewUrls}
        />
      );
    },
    [router, handleLongPress, swipeState.likedRestaurants]
  );

  return (
    <ScreenContainer containerClassName="bg-background" className="flex-1">
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>My Lists</Text>
        <Pressable
          onPress={openCreate}
          style={({ pressed }) => [styles.addBtn, { backgroundColor: colors.primary }, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.addBtnText}>+ New List</Text>
        </Pressable>
      </View>

      <FlatList
        data={lists}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No lists yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
              Create lists to organize your favorite restaurants.
            </Text>
          </View>
        }
      />

      {/* Create / Edit Modal */}
      <Modal
        visible={showCreate || !!editingList}
        transparent
        animationType="slide"
        onRequestClose={() => { setShowCreate(false); setEditingList(null); }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => { setShowCreate(false); setEditingList(null); setDescInput(""); }}
        >
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.surface }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {editingList ? "Rename List" : "New List"}
            </Text>

            {/* Emoji picker */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiRow}>
              {PRESET_EMOJIS.map((e) => (
                <Pressable
                  key={e}
                  onPress={() => setFormEmoji(e)}
                  style={[
                    styles.emojiBtn,
                    { borderColor: formEmoji === e ? colors.primary : "transparent" },
                    formEmoji === e && { backgroundColor: colors.primary + "20" },
                  ]}
                >
                  <Text style={styles.emojiText}>{e}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.nameRow}>
              <Text style={[styles.selectedEmoji]}>{formEmoji}</Text>
              <TextInput
                value={formName}
                onChangeText={setFormName}
                placeholder="List name…"
                placeholderTextColor={colors.muted}
                style={[styles.nameInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                autoFocus
                maxLength={30}
                onSubmitEditing={editingList ? handleRename : handleCreate}
                returnKeyType="done"
              />
            </View>

            {!editingList && (
              <TextInput
                value={descInput}
                onChangeText={setDescInput}
                placeholder="Description (optional)"
                placeholderTextColor={colors.muted}
                style={[styles.descInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                multiline
                numberOfLines={2}
                maxLength={120}
                returnKeyType="done"
                blurOnSubmit
              />
            )}

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => { setShowCreate(false); setEditingList(null); setDescInput(""); }}
                style={[styles.cancelBtn, { borderColor: colors.border }]}
              >
                <Text style={[styles.cancelText, { color: colors.muted }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={editingList ? handleRename : handleCreate}
                disabled={!formName.trim()}
                style={[styles.confirmBtn, { backgroundColor: colors.primary }, !formName.trim() && { opacity: 0.5 }]}
              >
                <Text style={styles.confirmText}>{editingList ? "Save" : "Create"}</Text>
              </Pressable>
            </View>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
  },
  addBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
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
    flex: 1,
    minHeight: 120,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  cardContent: {
    padding: 16,
    gap: 4,
  },
  cardEmoji: {
    fontSize: 32,
    marginBottom: 6,
  },
  cardName: {
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
  },
  cardCount: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  photoStrip: {
    flexDirection: "row",
    height: 72,
    position: "relative",
  },
  photoCell: {
    flex: 1,
    height: "100%",
  },
  photoStripOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "50%",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  photoEmoji: {
    position: "absolute",
    top: 6,
    left: 8,
    fontSize: 18,
  },
  cardTextPadded: {
    padding: 10,
    paddingTop: 8,
    gap: 2,
  },
  empty: {
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: 80,
    gap: 12,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  emojiRow: {
    flexDirection: "row",
  },
  emojiBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  emojiText: {
    fontSize: 24,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  selectedEmoji: {
    fontSize: 30,
  },
  nameInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  descInput: {
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    minHeight: 64,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  confirmText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
