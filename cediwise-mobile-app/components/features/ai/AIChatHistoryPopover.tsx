import { Menu, Separator } from "heroui-native";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View, ScrollView, Dimensions, ActivityIndicator } from "react-native";
import { useState, useEffect } from "react";
import { fetchChatSessions, type AIChatSession } from "@/hooks/aiChatTransport";
import { reportError } from "@/utils/telemetry";
import * as Haptics from "expo-haptics";

const MAX_HEIGHT = Dimensions.get("window").height * 0.5;

export interface AIChatHistoryPopoverProps {
  userId: string | null | undefined;
  currentSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
}

export function AIChatHistoryPopover(props: AIChatHistoryPopoverProps) {
  const { userId, currentSessionId, onSelectSession, onNewChat } = props;
  const [sessions, setSessions] = useState<AIChatSession[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !userId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const load = async () => {
      try {
        const data = await fetchChatSessions(userId);
        if (!cancelled) setSessions(data);
      } catch (e) {
        if (!cancelled) {
          reportError(e, {
            feature: "ai-chat",
            operation: "fetchChatSessions",
            extra: { userId },
          });
          setSessions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
      setLoading(false);
    };
  }, [open, userId]);

  const formatDate = (date: Date) => {
    try {
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return date.toDateString();
    }
  };

  return (
    <Menu presentation="popover" isOpen={open} onOpenChange={setOpen}>
      <Menu.Trigger asChild>
        <Pressable
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.7 : 1,
            marginRight: -10,
          })}
          accessibilityRole="button"
          accessibilityLabel="Chat history"
        >
          <Ionicons name="time-outline" size={24} color="#94a3b8" />
        </Pressable>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Overlay />
        <Menu.Content
          presentation="popover"
          placement="bottom"
          align="end"
          width={280}
          style={{ maxHeight: MAX_HEIGHT }}
          className="bg-slate-900 border border-slate-800 rounded-[22px] overflow-hidden"
        >
          <ScrollView showsVerticalScrollIndicator>
            <Menu.Item
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setOpen(false);
                onNewChat();
              }}
              className="py-3 px-4"
            >
              <View className="flex-row items-center gap-2">
                <Ionicons name="add-circle-outline" size={20} color="#10b981" />
                <Menu.ItemTitle className="text-emerald-400 font-semibold">
                  New Chat
                </Menu.ItemTitle>
              </View>
            </Menu.Item>

            <Separator className="bg-slate-800" />

            {loading ? (
              <View className="py-12 items-center justify-center">
                <ActivityIndicator color="#10b981" />
              </View>
            ) : sessions.length === 0 ? (
              <View className="py-8 items-center">
                <Text className="text-slate-500 text-sm">No previous chats</Text>
              </View>
            ) : (
              sessions.map((session) => {
                const isActive = session.id === currentSessionId;
                return (
                  <Menu.Item
                    key={session.id}
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      setOpen(false);
                      onSelectSession(session.id);
                    }}
                    className={`py-3 px-4 ${isActive ? "bg-emerald-500/10" : ""}`}
                  >
                    <View className="flex-row items-center gap-3">
                      <View
                        className={`w-2 h-2 rounded-full ${
                          isActive ? "bg-emerald-500" : "bg-slate-700"
                        }`}
                      />
                      <View className="flex-1">
                        <Menu.ItemTitle
                          numberOfLines={1}
                          className={`text-sm ${
                            isActive ? "text-white font-semibold" : "text-slate-300"
                          }`}
                        >
                          {session.title}
                        </Menu.ItemTitle>
                        <Text className="text-slate-500 text-[10px] mt-0.5">
                          {formatDate(session.startedAt)}
                        </Text>
                      </View>
                    </View>
                  </Menu.Item>
                );
              })
            )}
          </ScrollView>
        </Menu.Content>
      </Menu.Portal>
    </Menu>
  );
}
