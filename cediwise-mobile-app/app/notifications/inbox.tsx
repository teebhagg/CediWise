import { BackButton } from "@/components/BackButton";
import { Card } from "@/components/Card";
import { StandardHeader } from "@/components/CediWiseHeader";
import { PULL_REFRESH_EMERALD } from "@/constants/pullToRefresh";
import { GlassView } from "@/components/GlassView";
import { useAuth } from "@/hooks/useAuth";
import { useAppToast } from "@/hooks/useAppToast";
import {
  useAnnouncementInboxStore,
  type AnnouncementInboxItem,
} from "@/stores/notificationsStore";
import { getStandardHeaderBodyOffsetTop } from "@/utils/screenHeaderInsets";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Button, Dialog, ScrollShadow } from "heroui-native";
import { ChevronRight, Inbox, Megaphone } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function formatSentAt(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (days === 0) {
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Single-line preview: title · body (truncated visually via numberOfLines). */
function previewLine(item: AnnouncementInboxItem): string {
  const t = item.title.replace(/\s+/g, " ").trim();
  const b = item.body.replace(/\s+/g, " ").trim();
  if (!b) return t;
  return `${t} · ${b}`;
}

export default function AnnouncementInboxScreen() {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const { user } = useAuth();
  const { showError } = useAppToast();
  const items = useAnnouncementInboxStore((s) => s.items);
  const loading = useAnnouncementInboxStore((s) => s.loading);
  const lastError = useAnnouncementInboxStore((s) => s.lastError);
  const clearLastError = useAnnouncementInboxStore((s) => s.clearLastError);
  const refresh = useAnnouncementInboxStore((s) => s.refresh);
  const markRead = useAnnouncementInboxStore((s) => s.markRead);

  const [refreshing, setRefreshing] = useState(false);
  const [detailItem, setDetailItem] = useState<AnnouncementInboxItem | null>(null);

  const userId = user?.id;
  const dialogScrollMaxHeight = Math.round(Math.min(windowHeight * 0.72, 560));

  const load = useCallback(async () => {
    if (!userId) return;
    await refresh(userId);
  }, [userId, refresh]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (lastError) {
      showError("Couldn’t load updates", lastError);
      clearLastError();
    }
  }, [lastError, showError, clearLastError]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const headerBottomOffset = getStandardHeaderBodyOffsetTop(insets.top);

  const openDetail = useCallback(
    async (item: AnnouncementInboxItem) => {
      if (!userId) return;
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (!item.read) {
        await markRead(userId, item.id);
      }
      setDetailItem(item);
    },
    [userId, markRead],
  );

  const closeDetail = useCallback(async () => {
    try {
      await Haptics.selectionAsync();
    } catch {
      // ignore
    }
    setDetailItem(null);
  }, []);

  const handleDialogOpenChange = useCallback((open: boolean) => {
    if (!open) void closeDetail();
  }, [closeDetail]);

  const handleOpenDeepLink = useCallback(() => {
    const path = detailItem?.deep_link;
    if (!path?.startsWith("/")) return;
    setDetailItem(null);
    router.push(path as never);
  }, [detailItem]);

  const hasDeepLink =
    detailItem?.deep_link != null && detailItem.deep_link.startsWith("/");

  return (
    <View className="flex-1 bg-black">
      <StandardHeader
        title="Updates"
        leading={<BackButton />}
        centered
      />

      {loading && items.length === 0 ? (
        <View
          className="flex-1 items-center justify-center"
          style={{ paddingTop: headerBottomOffset }}
        >
          <ActivityIndicator size="large" color={PULL_REFRESH_EMERALD} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{
            paddingTop: headerBottomOffset + 6,
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 20,
            flexGrow: 1,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              tintColor={PULL_REFRESH_EMERALD}
              colors={[PULL_REFRESH_EMERALD]}
            />
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20 px-6">
              <View className="w-16 h-16 rounded-2xl bg-emerald-500/15 items-center justify-center mb-4">
                <Inbox size={32} color="#34d399" />
              </View>
              <Text
                style={{ fontFamily: "Figtree-Bold" }}
                className="text-white text-lg text-center mb-2"
              >
                No updates yet
              </Text>
              <Text
                style={{ fontFamily: "Figtree-Regular" }}
                className="text-slate-400 text-center text-sm leading-5"
              >
                When we send an announcement, it will appear here. Turn on push
                notifications in Profile to get alerts.
              </Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const preview = previewLine(item);
            const row = (
              <Pressable
                onPress={() => void openDetail(item)}
                accessibilityRole="button"
                accessibilityLabel={
                  item.read
                    ? `Update: ${item.title}`
                    : `Unread update: ${item.title}. Double tap to read.`
                }
                style={({ pressed }) => ({
                  opacity: pressed ? 0.88 : 1,
                  transform: [{ scale: pressed ? 0.99 : 1 }],
                })}
                className="mb-1.5"
              >
                <Card className="border border-white/10 overflow-hidden bg-[rgba(18,22,33,0.9)]">
                  <View className="flex-row items-center gap-2 px-2.5 py-2 min-h-[48px]">
                    {!item.read ? (
                      <View
                        className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"
                        accessibilityElementsHidden
                      />
                    ) : (
                      <View className="w-2 shrink-0" />
                    )}
                    <View className="w-9 h-9 rounded-xl bg-emerald-500/20 items-center justify-center shrink-0">
                      <Megaphone size={18} color="#34d399" />
                    </View>
                    <Text
                      style={{ fontFamily: "Figtree-Medium" }}
                      className="text-[15px] text-slate-200 flex-1 min-w-0 leading-5"
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {preview}
                    </Text>
                    {item.sent_at ? (
                      <Text
                        style={{ fontFamily: "Figtree-Regular" }}
                        className="text-slate-500 text-[11px] shrink-0 max-w-[52px] text-right"
                        numberOfLines={1}
                      >
                        {formatSentAt(item.sent_at)}
                      </Text>
                    ) : null}
                    <View className="shrink-0" accessibilityElementsHidden>
                      <ChevronRight size={18} color="#64748b" />
                    </View>
                  </View>
                </Card>
              </Pressable>
            );

            if (reducedMotion) {
              return row;
            }

            return (
              <Animated.View
                entering={FadeInDown.duration(280)
                  .delay(Math.min(index * 28, 140))
                  .springify()}
              >
                {row}
              </Animated.View>
            );
          }}
        />
      )}

      <Dialog isOpen={detailItem != null} onOpenChange={handleDialogOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="bg-black/65" />
          {Platform.OS === "ios" && (
            <GlassView
              intensity={7}
              tint="dark"
              className="absolute inset-0"
              onTouchEnd={() => void closeDetail()}
            />
          )}
          {/*
           * Same shell as AppDialog / EditCategoryLimitModal: KeyboardAvoidingView + horizontal
           * padding so the sheet never sits flush to the display edges (portal p-5 alone is not
           * always enough with FullWindowOverlay on iOS).
           */}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{
              flex: 1,
              width: "100%",
              justifyContent: "center",
              alignItems: "center",
              paddingTop: insets.top + 16,
              paddingBottom: insets.bottom + 16,
              paddingHorizontal: 16,
            }}
          >
            <Dialog.Content
              className="max-w-[360px] w-full rounded-2xl overflow-hidden bg-[rgba(18,22,33,0.98)] p-0"
              style={[styles.contentShadow, styles.dialogContentWidth]}
            >
              <Dialog.Close
                variant="ghost"
                className="absolute top-4 right-4 w-10 h-10 rounded-full z-10 bg-slate-600/60 border border-slate-500/50"
                iconProps={{ size: 20, color: "#e2e8f0" }}
                onPress={() => void closeDetail()}
                accessibilityLabel="Close"
                accessibilityRole="button"
              />
              <ScrollShadow
                color="#121621"
                LinearGradientComponent={LinearGradient}
              >
                <ScrollView
                  showsVerticalScrollIndicator
                  bounces={false}
                  keyboardShouldPersistTaps="handled"
                  style={{ maxHeight: dialogScrollMaxHeight }}
                  contentContainerStyle={styles.dialogScrollContent}
                >
                  <View style={styles.dialogHeader}>
                    <View style={styles.dialogIconWrap}>
                      <Megaphone size={22} color="#34d399" />
                    </View>
                    <Dialog.Title
                      accessibilityRole="header"
                      className="text-[20px] font-bold text-slate-100 leading-6 pr-10 flex-1"
                      style={{ fontFamily: "Figtree-Bold" }}
                    >
                      {detailItem?.title ?? ""}
                    </Dialog.Title>
                  </View>

                  {detailItem?.sent_at ? (
                    <Text
                      style={{ fontFamily: "Figtree-Regular" }}
                      className="text-slate-500 text-xs mb-3"
                    >
                      {new Date(detailItem.sent_at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </Text>
                  ) : null}

                  <Text
                    style={{ fontFamily: "Figtree-Regular" }}
                    className="text-slate-300 text-[15px] leading-[22px] mb-4"
                  >
                    {detailItem?.body ?? ""}
                  </Text>

                  <View className="gap-3">
                    {hasDeepLink ? (
                      <Button
                        variant="primary"
                        onPress={handleOpenDeepLink}
                        className="h-12 rounded-xl bg-emerald-500"
                      >
                        <Button.Label className="text-slate-900 font-semibold">
                          Open in app
                        </Button.Label>
                      </Button>
                    ) : null}
                    <Button
                      variant="outline"
                      onPress={() => void closeDetail()}
                      className="h-12 rounded-xl border-slate-600"
                    >
                      <Button.Label className="text-slate-200 font-semibold">
                        Done
                      </Button.Label>
                    </Button>
                  </View>
                </ScrollView>
              </ScrollShadow>
            </Dialog.Content>
          </KeyboardAvoidingView>
        </Dialog.Portal>
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  contentShadow: {
    ...Platform.select({
      ios: {
        shadowColor: "#020617",
        shadowOpacity: 0.35,
        shadowRadius: 28,
        shadowOffset: { width: 0, height: 12 },
      },
      android: { elevation: 18 },
    }),
  },
  /** Match AppDialog: full width of padded area, cap at 360pt. */
  dialogContentWidth: {
    width: "100%",
    maxWidth: 360,
    alignSelf: "stretch",
  },
  dialogScrollContent: {
    padding: 24,
    paddingTop: 28,
    paddingRight: 20,
    paddingBottom: 28,
  },
  dialogHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 8,
  },
  dialogIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
});
