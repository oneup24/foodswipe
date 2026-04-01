import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  Share,
  Alert,
  Animated,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useLanguage } from "@/hooks/use-language";
import { trpc } from "@/lib/trpc";
import { Restaurant } from "@/lib/types";

type SessionState = "idle" | "creating" | "waiting" | "joining" | "active";

interface FriendSessionModalProps {
  visible: boolean;
  onClose: () => void;
  onSyncLike: (placeId: string) => void; // called by parent when session is active + user likes
  syncLikeRef: React.MutableRefObject<((placeId: string) => void) | null>;
}

export function FriendSessionModal({ visible, onClose, onSyncLike, syncLikeRef }: FriendSessionModalProps) {
  const colors = useColors();
  const { t } = useLanguage();

  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [code, setCode] = useState("");
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [participantId, setParticipantId] = useState("");
  const [knownMatches, setKnownMatches] = useState<string[]>([]);
  const [matchRestaurant, setMatchRestaurant] = useState<string | null>(null);
  const matchOverlayOpacity = useRef(new Animated.Value(0)).current;

  const createMutation = trpc.friendSession.create.useMutation({
    onSuccess: (data) => {
      setCode(data.code);
      setParticipantId(data.participantId);
      setSessionState("waiting");
    },
  });

  const joinMutation = trpc.friendSession.join.useMutation({
    onSuccess: (data) => {
      if (data.valid && data.participantId) {
        setParticipantId(data.participantId);
        setCode(joinCodeInput.toUpperCase());
        setSessionState("active");
      } else {
        Alert.alert("Invalid Code", "Session not found or already full. Please try again.");
        setSessionState("joining");
      }
    },
  });

  const syncLikeMutation = trpc.friendSession.syncLike.useMutation({
    onSuccess: (data) => {
      if (data.newMatch && data.matchedPlaceId) {
        showMatch(data.matchedPlaceId);
      }
    },
  });

  // Expose syncLike to parent via ref
  useEffect(() => {
    if (sessionState === "active") {
      syncLikeRef.current = (placeId: string) => {
        syncLikeMutation.mutate({ code, participantId, placeId });
      };
    } else {
      syncLikeRef.current = null;
    }
  }, [sessionState, code, participantId]);

  // Poll for session updates (waiting for friend to join, or checking for matches)
  const { data: sessionData } = trpc.friendSession.getSession.useQuery(
    { code, participantId },
    {
      enabled: (sessionState === "waiting" || sessionState === "active") && !!code && !!participantId,
      refetchInterval: 3000,
    }
  );

  useEffect(() => {
    if (!sessionData) return;
    if (sessionState === "waiting" && sessionData.participantCount === 2) {
      setSessionState("active");
    }
    if (sessionState === "active" && sessionData.matches.length > knownMatches.length) {
      const newMatches = sessionData.matches.filter((m) => !knownMatches.includes(m));
      if (newMatches.length > 0) {
        showMatch(newMatches[newMatches.length - 1]);
        setKnownMatches(sessionData.matches);
      }
    }
  }, [sessionData, sessionState, knownMatches]);

  const showMatch = useCallback((placeId: string) => {
    setMatchRestaurant(placeId);
    Animated.sequence([
      Animated.timing(matchOverlayOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(matchOverlayOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => setMatchRestaurant(null));
  }, [matchOverlayOpacity]);

  const handleCreate = useCallback(() => {
    setSessionState("creating");
    createMutation.mutate();
  }, [createMutation]);

  const handleJoin = useCallback(() => {
    if (joinCodeInput.trim().length < 4) return;
    joinMutation.mutate({ code: joinCodeInput.trim() });
  }, [joinCodeInput, joinMutation]);

  const handleShareCode = useCallback(() => {
    Share.share({
      title: "Join me on FoodSwipe!",
      message: `Let's find a restaurant together! Join my FoodSwipe session with code: ${code}`,
    });
  }, [code]);

  const handleClose = useCallback(() => {
    setSessionState("idle");
    setCode("");
    setJoinCodeInput("");
    setParticipantId("");
    setKnownMatches([]);
    syncLikeRef.current = null;
    onClose();
  }, [onClose, syncLikeRef]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={() => {}}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {sessionState === "active" ? `👥 ${t("friend.active")}` : t("friend.title")}
            </Text>
            <Pressable onPress={handleClose} style={styles.closeBtn}>
              <Text style={[styles.closeBtnText, { color: colors.muted }]}>✕</Text>
            </Pressable>
          </View>

          {/* idle */}
          {sessionState === "idle" && (
            <View style={styles.body}>
              <Text style={[styles.description, { color: colors.muted }]}>
                Swipe the same restaurants as a friend. When you both like the same place — it's a Match!
              </Text>
              <Pressable
                onPress={handleCreate}
                style={({ pressed }) => [styles.primaryBtn, { backgroundColor: colors.primary }, pressed && { opacity: 0.8 }]}
              >
                <Text style={styles.primaryBtnText}>{t("friend.create")}</Text>
              </Pressable>
              <Pressable
                onPress={() => setSessionState("joining")}
                style={({ pressed }) => [styles.secondaryBtn, { borderColor: colors.border }, pressed && { opacity: 0.7 }]}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>{t("friend.join")}</Text>
              </Pressable>
            </View>
          )}

          {/* creating (loading) */}
          {sessionState === "creating" && (
            <View style={styles.body}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          )}

          {/* waiting */}
          {sessionState === "waiting" && (
            <View style={styles.body}>
              <Text style={[styles.codeLabel, { color: colors.muted }]}>{t("friend.sessionCode")}</Text>
              <Text style={[styles.codeText, { color: colors.primary }]}>{code}</Text>
              <Text style={[styles.description, { color: colors.muted }]}>{t("friend.waiting")}</Text>
              <ActivityIndicator color={colors.muted} style={{ marginVertical: 8 }} />
              <Pressable
                onPress={handleShareCode}
                style={({ pressed }) => [styles.primaryBtn, { backgroundColor: colors.primary }, pressed && { opacity: 0.8 }]}
              >
                <Text style={styles.primaryBtnText}>{t("friend.share")}</Text>
              </Pressable>
            </View>
          )}

          {/* joining */}
          {sessionState === "joining" && (
            <View style={styles.body}>
              <Text style={[styles.codeLabel, { color: colors.muted }]}>{t("friend.enterCode")}</Text>
              <TextInput
                value={joinCodeInput}
                onChangeText={(v) => setJoinCodeInput(v.toUpperCase())}
                placeholder="e.g. AB3X7K"
                placeholderTextColor={colors.muted}
                autoCapitalize="characters"
                maxLength={6}
                style={[styles.codeInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              />
              <Pressable
                onPress={handleJoin}
                disabled={joinMutation.isPending}
                style={({ pressed }) => [styles.primaryBtn, { backgroundColor: colors.primary }, pressed && { opacity: 0.8 }, joinMutation.isPending && { opacity: 0.6 }]}
              >
                {joinMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>{t("friend.joinBtn")}</Text>
                )}
              </Pressable>
            </View>
          )}

          {/* active */}
          {sessionState === "active" && (
            <View style={styles.body}>
              <Text style={[styles.description, { color: colors.muted }]}>
                Both of you are swiping! When you both ❤️ the same restaurant, you'll see a Match!
              </Text>
              <View style={[styles.activePill, { backgroundColor: "#34C75920", borderColor: "#34C759" }]}>
                <Text style={[styles.activePillText, { color: "#34C759" }]}>● Session Active</Text>
              </View>
              <Pressable
                onPress={handleClose}
                style={({ pressed }) => [styles.secondaryBtn, { borderColor: colors.border }, pressed && { opacity: 0.7 }]}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>Keep Swiping</Text>
              </Pressable>
            </View>
          )}
        </Pressable>
      </Pressable>

      {/* Match Overlay */}
      {matchRestaurant && (
        <Animated.View style={[styles.matchOverlay, { opacity: matchOverlayOpacity }]}>
          <Text style={styles.matchEmoji}>🎉</Text>
          <Text style={styles.matchTitle}>{t("friend.match")}</Text>
          <Text style={styles.matchDesc}>{t("friend.matchDesc")}</Text>
        </Animated.View>
      )}
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
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 18,
    fontWeight: "600",
  },
  body: {
    gap: 12,
    alignItems: "center",
  },
  description: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  primaryBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: "600",
  },
  codeLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  codeText: {
    fontSize: 40,
    fontWeight: "900",
    letterSpacing: 8,
  },
  codeInput: {
    width: "100%",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 6,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  activePill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  activePillText: {
    fontSize: 14,
    fontWeight: "700",
  },
  matchOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  matchEmoji: {
    fontSize: 80,
  },
  matchTitle: {
    fontSize: 36,
    fontWeight: "900",
    color: "#fff",
  },
  matchDesc: {
    fontSize: 16,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
  },
});
