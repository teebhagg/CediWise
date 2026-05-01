import { BackButton } from "@/components/BackButton";
import { PrimaryButton } from "@/components/PrimaryButton";
import {
  DEFAULT_STANDARD_HEIGHT,
  StandardHeader,
} from "@/components/CediWiseHeader";
import { useAppToast } from "@/hooks/useAppToast";
import { useAuth } from "@/hooks/useAuth";
import { useConnectivity } from "@/hooks/useConnectivity";
import { getStandardHeaderBodyOffsetTop } from "@/utils/screenHeaderInsets";
import { isOnline } from "@/utils/connectivity";
import { supabase } from "@/utils/supabase";
import { FEEDBACK_SOURCE_MOBILE_APP } from "@/constants/feedback";
import Constants from "expo-constants";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Bug, Lightbulb, MessageCircle, Star } from "lucide-react-native";
import { recordFullFeedbackScreenSubmitted } from "@/utils/feedbackPromptStorage";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type FeedbackCategory = "bug_report" | "feature_request" | "general_comment";

const CATEGORIES: {
  key: FeedbackCategory;
  label: string;
  icon: typeof Bug;
  color: string;
}[] = [
  { key: "bug_report", label: "Bug", icon: Bug, color: "#F87171" },
  { key: "feature_request", label: "Idea", icon: Lightbulb, color: "#FBBF24" },
  { key: "general_comment", label: "Other", icon: MessageCircle, color: "#60A5FA" },
];

export default function FeedbackScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isConnected } = useConnectivity();
  const { showError, showSuccess } = useAppToast();
  const [category, setCategory] = useState<FeedbackCategory>("general_comment");
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  /** Same-tick guard — `submitting` state may not flip before a second tap. */
  const submitInFlightRef = useRef(false);

  const appVersion = Constants.expoConfig?.version ?? "unknown";
  const deviceLabel = useMemo(
    () => `${Platform.OS} · ${Constants.deviceName ?? "device"}`,
    [],
  );

  const footerText = useMemo(
    () => `App v${appVersion} · ${deviceLabel}`,
    [appVersion, deviceLabel],
  );

  const trimmed = message.trim();
  const valid =
    rating != null &&
    rating >= 1 &&
    rating <= 5 &&
    trimmed.length >= 10 &&
    trimmed.length <= 2000;

  const onSubmit = useCallback(async () => {
    if (submitting || submitInFlightRef.current) return;

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    if (!user?.id || !supabase) {
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error,
      ).catch(() => {});
      showError("Sign in required", "Please sign in to send feedback.");
      return;
    }
    const email = (user.email ?? "").trim();
    if (!email) {
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error,
      ).catch(() => {});
      showError("Email missing", "We need an email on your account for follow-up.");
      return;
    }
    if (rating == null || rating < 1 || rating > 5) {
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error,
      ).catch(() => {});
      showError("Rate your experience", "Tap 1–5 stars before submitting.");
      return;
    }
    if (!valid) {
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error,
      ).catch(() => {});
      showError(
        "Check your message",
        "Feedback must be between 10 and 2000 characters.",
      );
      return;
    }

    if (isConnected === false) {
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error,
      ).catch(() => {});
      showError(
        "No internet connection",
        "You can’t send feedback until you have an active internet connection.",
      );
      return;
    }

    submitInFlightRef.current = true;
    setSubmitting(true);
    try {
      if (isConnected !== true) {
        const online = await isOnline();
        if (!online) {
          void Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Error,
          ).catch(() => {});
          showError(
            "No internet connection",
            "You can’t send feedback until you have an active internet connection.",
          );
          return;
        }
      }

      const { error } = await supabase.from("feedback").insert({
        category,
        rating,
        feedback_text: trimmed,
        email: email.toLowerCase(),
        is_beta: false,
        version: `${appVersion} (${Platform.OS})`,
        source: FEEDBACK_SOURCE_MOBILE_APP,
      });

      if (error) {
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Error,
        ).catch(() => {});
        showError("Couldn’t send", error.message);
        return;
      }

      void recordFullFeedbackScreenSubmitted(user.id).catch((e) => {
        console.warn("Failed to persist feedback prompt state:", e);
      });

      showSuccess("Thanks!", "Your feedback helps us improve CediWise.");
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => {});
      router.back();
    } finally {
      submitInFlightRef.current = false;
      setSubmitting(false);
    }
  }, [
    submitting,
    user?.id,
    user?.email,
    valid,
    trimmed,
    category,
    rating,
    appVersion,
    isConnected,
    showError,
    showSuccess,
  ]);

  const bodyTop = getStandardHeaderBodyOffsetTop(insets.top, DEFAULT_STANDARD_HEIGHT);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-black"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StandardHeader title="Send feedback" centered leading={<BackButton />} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: bodyTop + 16,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 32,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{ fontFamily: "Figtree-Regular" }}
          className="text-slate-400 text-sm mb-4 leading-5"
        >
          Tell us what&apos;s wrong, what you&apos;d like next, or anything else.
        </Text>

        <Text className="text-slate-500 text-xs uppercase tracking-wider mb-2">
          Category
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {CATEGORIES.map((c) => {
            const selected = category === c.key;
            const Icon = c.icon;
            return (
              <Pressable
                key={c.key}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setCategory(c.key);
                }}
                className={`flex-row items-center gap-2 px-4 py-3 rounded-xl border ${
                  selected
                    ? "bg-emerald-500/20 border-emerald-500/50"
                    : "bg-white/5 border-white/10"
                }`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={c.label}
              >
                <Icon size={18} color={c.color} />
                <Text
                  style={{ fontFamily: "Figtree-Medium" }}
                  className={selected ? "text-emerald-300" : "text-slate-300"}
                >
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text className="text-slate-500 text-xs uppercase tracking-wider mb-2">
          Overall rating
        </Text>
        <Text
          style={{ fontFamily: "Figtree-Regular" }}
          className="text-slate-500 text-xs mb-3"
        >
          How satisfied are you with CediWise right now?
        </Text>
        <View className="flex-row items-center gap-1 mb-6">
          {[1, 2, 3, 4, 5].map((n) => {
            const active = rating != null && n <= rating;
            return (
              <Pressable
                key={n}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setRating(n);
                }}
                className="p-1.5"
                accessibilityRole="button"
                accessibilityLabel={`${n} star${n === 1 ? "" : "s"}`}
                accessibilityState={{ selected: active }}
              >
                <Star
                  size={36}
                  color={active ? "#FBBF24" : "#475569"}
                  fill={active ? "#FBBF24" : "transparent"}
                  strokeWidth={active ? 0 : 1.8}
                />
              </Pressable>
            );
          })}
        </View>
        {rating == null ? (
          <Text className="text-slate-600 text-xs mb-6">Tap a star to rate (required)</Text>
        ) : (
          <Text className="text-slate-500 text-xs mb-6">
            {rating === 5
              ? "Excellent"
              : rating === 4
                ? "Good"
                : rating === 3
                  ? "Okay"
                  : rating === 2
                    ? "Needs work"
                    : "Poor"}
          </Text>
        )}

        <Text className="text-slate-500 text-xs uppercase tracking-wider mb-2">
          Message
        </Text>
        <TextInput
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white min-h-[140px] text-base"
          style={{ fontFamily: "Figtree-Regular", textAlignVertical: "top" }}
          placeholder="What happened or what would help you?"
          placeholderTextColor="#64748b"
          multiline
          maxLength={2000}
          value={message}
          onChangeText={setMessage}
          accessibilityLabel="Feedback message"
        />
        <Text className="text-slate-600 text-xs mt-1">
          {trimmed.length}/2000 · minimum 10 characters
        </Text>

        <Text
          style={{ fontFamily: "Figtree-Regular" }}
          className="text-slate-500 text-xs mt-6 leading-5"
        >
          {footerText}
        </Text>

        {isConnected === false ? (
          <View
            className="mt-6 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3"
            accessibilityRole="alert"
          >
            <Text
              style={{ fontFamily: "Figtree-Medium" }}
              className="text-amber-200 text-sm leading-5"
            >
              You can&apos;t send feedback until you have an active internet
              connection. Please connect and try again.
            </Text>
          </View>
        ) : null}

        <View className="mt-8">
          <PrimaryButton
            loading={submitting}
            disabled={!valid || submitting || isConnected === false}
            onPress={() => void onSubmit()}
            accessibilityLabel="Submit feedback"
          >
            Submit feedback
          </PrimaryButton>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
