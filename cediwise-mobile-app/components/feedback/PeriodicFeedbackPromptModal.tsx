import { AppDialog } from "@/components/AppDialog";
import { AppTextField } from "@/components/AppTextField";
import * as Haptics from "expo-haptics";
import { MessageCircle, Star } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

type Props = {
  visible: boolean;
  working: boolean;
  onLater: () => void;
  onNeverAsk: () => void;
  submitQuickRating: (
    rating: number,
    details?: string | null,
  ) => Promise<{ ok: boolean; message?: string }>;
  onSubmitError: (title: string, message: string) => void;
};

export function PeriodicFeedbackPromptModal({
  visible,
  working,
  onLater,
  onNeverAsk,
  submitQuickRating,
  onSubmitError,
}: Props) {
  const [rating, setRating] = useState<number | null>(null);
  const [detailMode, setDetailMode] = useState(false);
  const [detailMessage, setDetailMessage] = useState("");

  useEffect(() => {
    if (visible) {
      setRating(null);
      setDetailMode(false);
      setDetailMessage("");
    }
  }, [visible]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) onLater();
    },
    [onLater],
  );

  const handleSecondary = useCallback(() => {
    if (detailMode) {
      void Haptics.selectionAsync().catch(() => undefined);
      setDetailMode(false);
      setDetailMessage("");
      return;
    }
    onLater();
  }, [detailMode, onLater]);

  const handlePrimary = useCallback(async () => {
    if (rating == null || rating < 1 || rating > 5) {
      onSubmitError("Pick a rating", "Tap the stars first.");
      throw new Error("__feedback_prompt_validation__");
    }

    const trimmed = detailMessage.trim();
    if (trimmed.length > 0 && trimmed.length < 10) {
      onSubmitError(
        "Check your message",
        "Use at least 10 characters or clear the note to send your rating only.",
      );
      throw new Error("__feedback_prompt_validation__");
    }

    const details = trimmed.length >= 10 ? trimmed : null;
    const result = await submitQuickRating(rating, details);
    if (!result.ok) {
      onSubmitError(
        "Could not send",
        result.message ?? "Please try again.",
      );
      throw new Error("__feedback_prompt_submit__");
    }
  }, [rating, detailMessage, submitQuickRating, onSubmitError]);

  return (
    <AppDialog
      visible={visible}
      onOpenChange={handleOpenChange}
      onClose={onLater}
      icon={<MessageCircle size={22} color="#6EE7B7" />}
      title="How is CediWise working for you?"
      description={
        detailMode
          ? "Optional note — at least 10 characters if you write something. Your star rating is still required."
          : "Tap the stars to rate your experience. You can add an optional note below."
      }
      primaryLabel={detailMode ? "Send feedback" : "Submit rating"}
      onPrimary={handlePrimary}
      secondaryLabel={detailMode ? "Back" : "Maybe later"}
      onSecondary={handleSecondary}
      loading={working}
    >
      <View className="gap-4">
        <View>
          <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Overall
          </Text>
          <View className="flex-row justify-center gap-1 flex-wrap">
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
                  disabled={working}
                  accessibilityRole="button"
                  accessibilityLabel={`${n} star${n === 1 ? "" : "s"}`}
                  accessibilityState={{ selected: active }}
                >
                  <Star
                    size={34}
                    color={active ? "#FBBF24" : "#475569"}
                    fill={active ? "#FBBF24" : "transparent"}
                    strokeWidth={active ? 0 : 1.8}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        {!detailMode ? (
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync();
              setDetailMode(true);
            }}
            className="py-2"
            disabled={working}
            accessibilityRole="button"
            accessibilityLabel="Tell us more — show feedback field"
          >
            <Text className="text-emerald-400 font-semibold text-center text-[15px]">
              Tell us more
            </Text>
          </Pressable>
        ) : (
          <AppTextField
            label="Your feedback"
            value={detailMessage}
            onChangeText={setDetailMessage}
            placeholder="What would help you most?"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            inputClassName="min-h-[120px] py-3 px-4"
            returnKeyType="default"
          />
        )}

        <Pressable
          onPress={() => {
            void Haptics.selectionAsync();
            onNeverAsk();
          }}
          disabled={working}
          className="py-1"
          accessibilityRole="button"
          accessibilityLabel="Do not show this prompt again"
        >
          <Text className="text-slate-500 text-[13px] font-semibold text-center">
            Don&apos;t ask again
          </Text>
        </Pressable>
      </View>
    </AppDialog>
  );
}
