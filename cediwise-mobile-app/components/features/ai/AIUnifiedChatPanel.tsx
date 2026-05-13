import { AIActionCard } from "@/components/features/ai/AIActionCard";
import { AIChatHistoryPopover } from "@/components/features/ai/AIChatHistoryPopover";
import {
  QuickPrompts,
  SuggestionChips,
} from "@/components/features/ai/QuickPrompts";
import {
  BudgetChatV1,
  CHAT_V1_LAYOUT_ANIMATION,
  type BudgetGiftedMessage,
} from "@/components/templates/chat-v1/budget-chat-v1";
import { chatTheme } from "@/constants/chatTheme";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchChatHistory,
  fetchChatUsage,
  resolveCategoryByAiName,
  sendAiChatTurn,
} from "@/hooks/aiChatTransport";
import {
  AI_CHAT_ASSISTANT_ID,
  AI_CHAT_USER_ID,
} from "@/types/ai";

import { useAIChatShellStore } from "@/stores/aiChatShellStore";
import type { BudgetBucket, BudgetCategory, Debt } from "@/types/budget";
import { analytics } from "@/utils/analytics";
import { getStoredAuthData, refreshStoredSession } from "@/utils/auth";
import { supabase } from "@/utils/supabase";
import { uuidv4 } from "@/utils/uuid";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from "react";
import {
  Alert,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Share,
  View,
  type ViewStyle,
} from "react-native";
import { Bubble, GiftedChat, type IMessage } from "react-native-gifted-chat";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const USER_ID = AI_CHAT_USER_ID;
const AI_ID = AI_CHAT_ASSISTANT_ID;

const FAB_AVATAR = require("@/assets/images/my-notion-face-transparent.png");

const userBubbleShadow = Platform.select<ViewStyle>({
  ios: {
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 14,
  },
  android: { elevation: 8 },
});

function parseOccurredAt(iso?: string): Date {
  const t = Date.parse(String(iso ?? ""));
  return Number.isFinite(t) ? new Date(t) : new Date();
}

export interface AIUnifiedChatPanelProps {
  userId: string | null | undefined;
  timezone: string;
  categories: BudgetCategory[];
  activeCycleId: string | null;
  healthScore?: { score: number } | null;
  contextType?: "budget" | "debt";
  // Budget Actions
  addTransaction: (params: {
    bucket: BudgetBucket;
    categoryId?: string | null;
    amount: number;
    note?: string;
    occurredAt?: Date;
  }) => Promise<{ wouldExceedNeeds?: boolean } | void>;
  updateCategoryLimit: (id: string, limit: number) => Promise<void>;
  addCategory: (params: { name: string; bucket: BudgetBucket; limitAmount: number }) => Promise<void>;
  updateCycleAllocation: (
    id: string,
    alloc: { needsPct: number; wantsPct: number; savingsPct: number },
    opts: { reallocationReason: string },
  ) => Promise<void>;
  // Debt Actions
  recordDebtPayment?: (debtId: string, amount: number) => Promise<void>;
  createDebt?: (params: any) => Promise<void>;
  debts?: Debt[];
  debtToIncomeRatio?: number;

  onClose: () => void;
  initialMessage?: string;
  initialDraft?: string;
}

export function AIUnifiedChatPanel(props: AIUnifiedChatPanelProps) {
  const {
    userId,
    timezone,
    categories,
    activeCycleId,
    healthScore,
    addTransaction,
    updateCategoryLimit,
    addCategory,
    updateCycleAllocation,
    recordDebtPayment,
    debts,
    debtToIncomeRatio,
    onClose,
    initialMessage,
    initialDraft,
    contextType = "budget",
  } = props;

  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const abortRef = useRef<AbortController | null>(null);

  const sessionId = useAIChatShellStore((s) => s.sessionId);
  const remainingChats = useAIChatShellStore((s) => s.remainingChats);
  const chatLimit = useAIChatShellStore((s) => s.chatLimit);
  const setUsageMeta = useAIChatShellStore((s) => s.setUsageMeta);
  const resetSession = useAIChatShellStore((s) => s.resetSession);

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
  const anonKey =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.EXPO_PUBLIC_SUPABASE_KEY ??
    "";

  const [messages, setMessages] = useState<BudgetGiftedMessage[]>([]);
  const loadingRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  /** Hide welcome spinner while loading history after "New chat" (empty session). */
  const [suppressWelcomeHistorySpinner, setSuppressWelcomeHistorySpinner] =
    useState(false);
  const [limitMsg, setLimitMsg] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      analytics.aiChatSessionOpened({
        remaining:
          typeof remainingChats === "number" ? String(remainingChats) : "",
        context: contextType,
      });

      const load = async () => {
        if (!userId || !sessionId) return;
        setHistoryLoading(true);
        setMessages([]);
        try {
          const [history, usage] = await Promise.all([
            fetchChatHistory(userId, sessionId),
            fetchChatUsage(userId),
          ]);

          if (history.length > 0) {
            setMessages(history);
          }
          if (usage) {
            setUsageMeta(usage.remaining, usage.limit);
          }
        } catch (e) {
          console.error("Failed to load AI history/usage:", e);
        } finally {
          setSuppressWelcomeHistorySpinner(false);
          setHistoryLoading(false);
        }
      };
      void load();

      return () => {
        abortRef.current?.abort();
      };
    }, [userId, sessionId, contextType, remainingChats, setUsageMeta]),
  );

  const giftedUser = useMemo(
    () => ({
      _id: USER_ID,
      name: user?.name || "Me",
      avatar: user?.avatar,
    }),
    [user?.name, user?.avatar],
  );

  const aiBubble = useMemo(
    () => ({
      _id: AI_ID,
      name: "AI",
      avatar: FAB_AVATAR,
    }),
    [],
  );

  const runSend = useCallback(
    async (plain: string) => {
      const text = plain.trim();
      if (
        !text ||
        loadingRef.current ||
        limitMsg ||
        !supabaseUrl ||
        !anonKey ||
        !activeCycleId
      ) {
        return;
      }
      loadingRef.current = true;
      setBusy(true);
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      const reqStartedAt = Date.now();

      const assistantId = uuidv4();

      LayoutAnimation.configureNext(CHAT_V1_LAYOUT_ANIMATION);
      setMessages((prev) =>
        GiftedChat.append(
          prev,
          [
            {
              _id: uuidv4(),
              text,
              createdAt: new Date(),
              user: giftedUser,
            } as BudgetGiftedMessage,
            {
              _id: assistantId,
              text: " ",
              createdAt: new Date(),
              user: aiBubble,
            } as BudgetGiftedMessage,
          ],
          false,
        ),
      );

      analytics.aiChatMessageSent({
        length: String(text.length),
        is_action: "false",
        context: contextType,
      });

      await refreshStoredSession();
      const auth = await getStoredAuthData();
      const token = auth?.accessToken;
      if (!token || !userId) {
        setMessages((prev) => prev.filter((m) => m._id !== assistantId));
        loadingRef.current = false;
        setBusy(false);
        return;
      }

      let streamed = "";

      await sendAiChatTurn({
        supabaseUrl,
        anonKey,
        accessToken: token,
        sessionId,
        message: text,
        ianaTimezone: timezone,
        context_type: contextType,
        signal: abortRef.current.signal,
        onToken: (t) => {
          streamed += t;
          setMessages((prev) =>
            prev.map((m) =>
              m._id === assistantId
                ? ({
                  ...m,
                  text: streamed,
                  structured: undefined,
                } as BudgetGiftedMessage)
                : m,
            ),
          );
        },
        onDone: (structured, usage) => {
          if (usage) setUsageMeta(usage.remaining, usage.limit);
          setMessages((prev) =>
            prev.map((m) =>
              m._id === assistantId
                ? ({
                  ...m,
                  text:
                    structured?.type === "text"
                      ? structured.text
                      : streamed || String(m.text ?? ""),
                  structured: structured ?? undefined,
                } as BudgetGiftedMessage)
                : m,
            ),
          );
          analytics.aiChatMessageReceived({
            latency_ms: String(Date.now() - reqStartedAt),
          });
        },
        onLimitError: (p) => {
          analytics.aiChatLimitReached({
            used: String(p.used),
            limit: String(p.limit),
            tier: p.tier ?? "",
          });
          setLimitMsg(
            `You've used ${p.used}/${p.limit} AI chats today (resets at midnight).`,
          );
          setUsageMeta(0, p.limit);
        },
        onHttpError: (status, body) => {
          setMessages((prev) =>
            prev.map((m) =>
              m._id === assistantId
                ? {
                  ...m,
                  text:
                    streamed ||
                    `I'm having trouble connecting right now. Please try again in a moment.`,
                }
                : m,
            ),
          );
        },
      });

      loadingRef.current = false;
      setBusy(false);
    },
    [
      activeCycleId,
      aiBubble,
      anonKey,
      giftedUser,
      limitMsg,
      sessionId,
      setUsageMeta,
      supabaseUrl,
      timezone,
      userId,
      contextType,
    ],
  );

  const initialSentRef = useRef(false);

  React.useEffect(() => {
    if (
      !historyLoading &&
      messages.length === 0 &&
      initialMessage &&
      !initialSentRef.current
    ) {
      initialSentRef.current = true;
      void runSend(initialMessage);
    }
  }, [historyLoading, messages.length, initialMessage, runSend]);

  const handleBubbleLongPress = useCallback((_context: any, message: IMessage) => {
    if (!message.text) return;
    Alert.alert(
      "Message Actions",
      undefined,
      [
        {
          text: "Copy Text",
          onPress: () => Clipboard.setStringAsync(message.text),
        },
        {
          text: "Share",
          onPress: () => Share.share({ message: message.text }),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
      { cancelable: true },
    );
  }, []);

  const renderBubble = useCallback(
    (bubbleProps: {
      currentMessage?: BudgetGiftedMessage;
      [key: string]: unknown;
    }): ReactElement => {
      const current = bubbleProps.currentMessage as BudgetGiftedMessage;
      const isUser = current.user._id === USER_ID;

      const cancelAction = async () => {
        const newStructured = current.structured
          ? { ...current.structured, status: "skipped" as const }
          : undefined;

        setMessages((prev) =>
          prev.map((m) =>
            m._id === current._id
              ? ({
                ...m,
                structured: newStructured,
              } as BudgetGiftedMessage)
              : m,
          ),
        );

        if (newStructured) {
          try {
            await supabase
              .from("ai_chat_history")
              .update({ content: JSON.stringify(newStructured) })
              .eq("id", current._id);
          } catch (e) {
            console.error("Failed to persist skip:", e);
          }
        }
      };

      const confirmAction = async () => {
        if (current.structured?.type !== "action") return;
        const { action, payload } = current.structured;

        try {
          if (action === "bulk_create_transactions") {
            type Row = { cat?: string; qty?: number; amt?: number; date?: string };
            const raw = payload.transactions;
            const rows: Row[] = Array.isArray(raw) ? raw : [];
            for (const row of rows) {
              const catMatch = resolveCategoryByAiName(
                String(row.cat ?? ""),
                categories,
              );
              if (!catMatch) continue;
              const qty = Math.max(1, Math.floor(Number(row.qty) || 1));
              const amt = Math.max(0, Number(row.amt) || 0);
              const when = parseOccurredAt(String(row.date));
              for (let j = 0; j < qty; j++) {
                await addTransaction({
                  bucket: catMatch.bucket,
                  categoryId: catMatch.id,
                  amount: amt,
                  occurredAt: when,
                  note: "AI bulk log",
                });
              }
            }
          } else if (action === "update_category_limit") {
            const catId = String(payload.category_id || "");
            const limit = Number(payload.new_limit || 0);
            if (catId && !isNaN(limit)) {
              await updateCategoryLimit(catId, limit);
            }
          } else if (action === "create_category") {
            const name = String(payload.name || "");
            const bucket = (payload.bucket as BudgetBucket) || "wants";
            const limit = Number(payload.limit_amount || 0);
            if (name) {
              await addCategory({ name, bucket, limitAmount: limit });
            }
          } else if (action === "reallocate_budget") {
            const cycleId = activeCycleId;
            if (!cycleId) return;
            const parsePct = (val: any) => {
              if (typeof val === "string") val = val.replace(/%/g, "");
              const n = Number(val);
              if (isNaN(n)) return 0;
              return n > 1 ? n / 100 : n;
            };
            const needs = parsePct(payload.needs_pct);
            const wants = parsePct(payload.wants_pct);
            const savings = parsePct(payload.savings_pct);
            if (!isNaN(needs) && !isNaN(wants) && !isNaN(savings)) {
              await updateCycleAllocation(
                cycleId,
                { needsPct: needs, wantsPct: wants, savingsPct: savings },
                { reallocationReason: "AI suggested reallocation" },
              );
            }
          } else if (action === "record_debt_payment") {
            const debtId = String(payload.debt_id || "");
            const amt = Number(payload.amount || 0);
            if (debtId && amt > 0 && recordDebtPayment) {
              await recordDebtPayment(debtId, amt);
            }
          }
          const newStructured = current.structured
            ? { ...current.structured, status: "applied" as const }
            : undefined;

          setMessages((prev) =>
            prev.map((m) =>
              m._id === current._id
                ? ({
                  ...m,
                  structured: newStructured,
                } as BudgetGiftedMessage)
                : m,
            ),
          );

          if (newStructured) {
            try {
              await supabase
                .from("ai_chat_history")
                .update({ content: JSON.stringify(newStructured) })
                .eq("id", current._id);
            } catch (e) {
              console.error("Failed to persist apply:", e);
            }
          }

          void Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          ).catch(() => undefined);
          analytics.aiActionConfirmed({ action });
        } catch (e) {
          console.error("Action failed:", e);
          Alert.alert("Action Failed", "Something went wrong while performing this action.");
          void cancelAction();
          analytics.aiActionFailed({ action });
          return;
        }
      };

      const isSkipped =
        current.structured?.status === "skipped" ||
        current.structured?.status === "applied";

      return (
        <View style={{ marginBottom: chatTheme.messageRowGap, flexShrink: 1 }}>
          <Bubble
            {...(bubbleProps as unknown as React.ComponentProps<typeof Bubble>)}
            onLongPress={handleBubbleLongPress}
            containerStyle={{
              right: { paddingRight: 14, paddingLeft: 14, marginTop: 0 },
              left: { paddingLeft: 0, paddingRight: 14, marginTop: 0 },
            }}
            wrapperStyle={{
              right: {
                backgroundColor: chatTheme.userBubbleBg,
                borderRadius: 22,
                borderWidth: 1,
                borderColor: chatTheme.userBubbleBorder,
                ...userBubbleShadow,
              },
              left: {
                backgroundColor: "transparent",
                borderRadius: 0,
                borderWidth: 0,
                elevation: 0,
                shadowOpacity: 0,
                marginLeft: -8,
              },
            }}
            textStyle={{
              left: {
                color: chatTheme.assistantBubbleText,
                fontSize: 15,
                lineHeight: 21,
              },
              right: {
                color: chatTheme.userBubbleText,
                fontSize: 15,
                lineHeight: 21,
              },
            }}
          />
          {!isUser && current.structured?.type === "action" ? (
            <View style={{ paddingLeft: 0, paddingRight: 14, width: "100%" }}>
              <AIActionCard
                message={current.structured}
                categories={categories}
                debts={debts}
                onConfirm={confirmAction}
                isSkipped={isSkipped}
                onCancel={() => {
                  const act =
                    current.structured?.type === "action"
                      ? current.structured.action
                      : "";
                  void cancelAction();
                  analytics.aiActionCancelled({ action: act });
                }}
              />
            </View>
          ) : null}
        </View>
      );
    },
    [
      addTransaction,
      categories,
      addCategory,
      updateCategoryLimit,
      updateCycleAllocation,
      recordDebtPayment,
      activeCycleId,
      debts,
      handleBubbleLongPress,
    ],
  );

  const handleRegenerate = useCallback(() => {
    // GiftedChat inverted: index 0 is newest; scan forward for the latest user turn.
    let lastUserMsg: BudgetGiftedMessage | undefined;
    let idx = -1;
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].user._id === AI_CHAT_USER_ID) {
        lastUserMsg = messages[i];
        idx = i;
        break;
      }
    }
    if (!lastUserMsg || idx === -1) return;

    setMessages(messages.slice(idx + 1));
    void runSend(String(lastUserMsg.text));
  }, [messages, runSend]);

  const headerSubtitle =
    remainingChats != null && chatLimit != null
      ? `${remainingChats}/${chatLimit} chats left today`
      : undefined;

  const topChromeHeight = insets.top + 76;
  const composerDisabled = busy || !!limitMsg || !activeCycleId;

  const lastAssistantMsgWithChips = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.user._id === AI_CHAT_ASSISTANT_ID && m.structured?.chips?.length) {
        return m;
      }
    }
    return null;
  }, [messages]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: chatTheme.surface,
        paddingBottom: insets.bottom,
      }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <BudgetChatV1
          messages={messages}
          giftedUser={giftedUser as IMessage["user"]}
          topChromeHeight={topChromeHeight}
          welcomeTitle="CediWise AI"
          welcomeSubtitle={contextType === 'debt' ? "Your debt-free journey starts here. Ask about repayment strategies, progress, or how to clear your debts faster." : "Your personal finance advisor. Ask me anything about your budget, spending, or how to save more."}
          onSendPlain={(t) => {
            void runSend(t);
          }}
          renderAboveComposer={
            lastAssistantMsgWithChips ? (
              <SuggestionChips
                chips={lastAssistantMsgWithChips.structured!.chips!}
                disabled={composerDisabled}
                onPick={(p) => {
                  void runSend(p);
                }}
              />
            ) : (
              <QuickPrompts
                mode={contextType}
                healthScore={healthScore}
                debtToIncomeRatio={debtToIncomeRatio}
                disabled={composerDisabled}
                onPick={(p) => {
                  void runSend(p);
                }}
              />
            )
          }
          limitBanner={limitMsg}
          welcomeLoading={
            historyLoading && !suppressWelcomeHistorySpinner
          }
          composerDisabled={composerDisabled}
          composerPlaceholder={contextType === 'debt' ? "Ask about your debts..." : "Ask about your budget..."}
          initialDraft={initialDraft}
          headerTitle={contextType === 'debt' ? "Debt Assistant" : "CediWise AI"}
          headerSubtitle={headerSubtitle}
          onClose={() => {
            abortRef.current?.abort();
            onClose();
          }}
          onRegenerate={handleRegenerate}
          renderHeaderActions={() => (
            <AIChatHistoryPopover
              userId={userId}
              currentSessionId={sessionId}
              onNewChat={() => {
                setSuppressWelcomeHistorySpinner(true);
                resetSession();
                setMessages([]);
              }}
              onSelectSession={(sid) => {
                setSuppressWelcomeHistorySpinner(false);
                useAIChatShellStore.setState({ sessionId: sid });
              }}
            />
          )}
          renderBubble={renderBubble}
        />
      </KeyboardAvoidingView>
    </View>
  );
}
