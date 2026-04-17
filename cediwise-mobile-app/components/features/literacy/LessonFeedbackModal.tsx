import { CustomBottomSheet } from "@/components/common/CustomBottomSheet";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";
import { useAuth } from "@/hooks/useAuth";
import { reportError } from "@/utils/telemetry";
import { supabase } from "@/utils/supabase";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { AppTextField } from "@/components/AppTextField";

type FeedbackType = "helpful" | "unclear" | "incorrect" | "suggestion" | "other";

type LessonFeedbackModalProps = {
  lessonId: string;
  lessonTitle: string;
  visible: boolean;
  onClose: () => void;
};

export function LessonFeedbackModal({
  lessonId,
  lessonTitle,
  visible,
  onClose,
}: LessonFeedbackModalProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState<number | null>(null);
  const [feedbackType, setFeedbackType] = useState<FeedbackType | null>(null);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!user?.id || !rating || !feedbackType) return;
    if (!supabase) {
      setSubmitError("Feedback is unavailable right now. Please try again.");
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { error } = await supabase.from("lesson_feedback").insert({
        user_id: user.id,
        lesson_id: lessonId,
        rating,
        feedback_type: feedbackType,
        comment: comment.trim() || null,
      });

      if (error) {
        reportError(error, {
          feature: "literacy",
          operation: "lesson_feedback_insert",
          extra: { lessonId, code: error.code },
        });
        setSubmitError(
          error.message || "Could not send feedback. Please try again."
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (error) {
      reportError(error, {
        feature: "literacy",
        operation: "lesson_feedback_insert",
        extra: { lessonId },
      });
      setSubmitError("Something went wrong. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const feedbackOptions: {
    type: FeedbackType;
    label: string;
    emoji: string;
  }[] = [
      { type: "helpful", label: "Helpful", emoji: "✅" },
      { type: "unclear", label: "Unclear", emoji: "❓" },
      { type: "incorrect", label: "Incorrect", emoji: "❌" },
      { type: "suggestion", label: "Suggestion", emoji: "💡" },
      { type: "other", label: "Other", emoji: "💬" },
    ];

  return (
    <CustomBottomSheet
      title={`Feedback: ${lessonTitle}`}
      isOpen={visible}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <View style={{ paddingBottom: 24 }}>
        {/* Rating */}
        <Text
          className="text-slate-300 text-sm mb-3"
          style={{ fontFamily: "Figtree-Medium" }}
        >
          How helpful was this lesson?
        </Text>
        <View className="flex-row gap-3 mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable
              key={star}
              onPress={() => {
                setRating(star);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Rate ${star} out of 5`}
              accessibilityHint="Sets how helpful this lesson was"
              accessibilityState={{ selected: rating === star }}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              className={`w-12 h-12 rounded-full items-center justify-center ${rating && rating >= star ? "bg-emerald-500" : "bg-slate-700"
                }`}
            >
              <Text className="text-xl">⭐</Text>
            </Pressable>
          ))}
        </View>

        {/* Feedback Type */}
        <Text
          className="text-slate-300 text-sm mb-3"
          style={{ fontFamily: "Figtree-Medium" }}
        >
          What type of feedback?
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {feedbackOptions.map((option) => (
            <Pressable
              key={option.type}
              onPress={() => {
                setFeedbackType(option.type);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Feedback type: ${option.label}`}
              accessibilityState={{ selected: feedbackType === option.type }}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              className={`px-4 py-2 rounded-full flex-row items-center gap-2 ${feedbackType === option.type
                  ? "bg-emerald-500/20 border-emerald-500"
                  : "bg-slate-700/50 border-slate-600"
                } border`}
            >
              <Text className="text-base">{option.emoji}</Text>
              <Text
                className={`text-sm ${feedbackType === option.type
                    ? "text-emerald-400"
                    : "text-slate-300"
                  }`}
                style={{ fontFamily: "Figtree-Medium" }}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <AppTextField
          label="Additional comments (optional)"
          placeholder="Tell us more..."
          multiline
          numberOfLines={3}
          value={comment}
          onChangeText={setComment}
          inputClassName="min-h-[100px] text-base py-3 mb-4"
          returnKeyType="default"
          // style={{ textAlignVertical: "top" }}
        />

        {submitError ? (
          <Text
            className="text-red-400 text-sm mb-3"
            style={{ fontFamily: "Figtree-Medium" }}
          >
            {submitError}
          </Text>
        ) : null}

        {/* Actions */}
        <View className="flex-row gap-3">
          <View className="flex-1">
            <PrimaryButton
              onPress={handleSubmit}
              disabled={!rating || !feedbackType || isSubmitting}
              accessibilityLabel={
                isSubmitting ? "Submitting feedback" : "Submit lesson feedback"
              }
              accessibilityHint="Sends your rating and comments to CediWise"
            >
              <Text
                className="text-slate-950 font-medium"
                style={{ fontFamily: "Figtree-Medium" }}
              >
                {isSubmitting ? "Submitting..." : "Submit Feedback"}
              </Text>
            </PrimaryButton>
          </View>
          <SecondaryButton
            onPress={onClose}
            accessibilityLabel="Cancel feedback"
          >
            <Text
              className="text-slate-300 font-medium"
              style={{ fontFamily: "Figtree-Medium" }}
            >
              Cancel
            </Text>
          </SecondaryButton>
        </View>
      </View>
    </CustomBottomSheet>
  );
}
