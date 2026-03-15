import { CustomBottomSheet } from "@/components/common/CustomBottomSheet";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/utils/supabase";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

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

  const handleSubmit = async () => {
    if (!user?.id || !rating || !feedbackType) return;

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await supabase?.from("lesson_feedback").insert({
        user_id: user.id,
        lesson_id: lessonId,
        rating,
        feedback_type: feedbackType,
        comment: comment.trim() || null,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (error) {
      console.error("[LessonFeedback] Failed to submit:", error);
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

        {/* Comment */}
        <Text
          className="text-slate-300 text-sm mb-3"
          style={{ fontFamily: "Figtree-Medium" }}
        >
          Additional comments (optional)
        </Text>
        <TextInput
          placeholder="Tell us more..."
          placeholderTextColor="#64748b"
          multiline
          maxLength={500}
          value={comment}
          onChangeText={setComment}
          style={{
            fontFamily: "Figtree-Regular",
            fontSize: 16,
            textAlignVertical: "top",
            backgroundColor: "rgba(30, 41, 59, 0.5)",
            borderWidth: 1,
            borderColor: "#475569",
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            minHeight: 100,
            marginBottom: 24,
            color: "#ffffff",
          }}
        />

        {/* Actions */}
        <View className="flex-row gap-3">
          <View className="flex-1">
            <PrimaryButton
              onPress={handleSubmit}
              disabled={!rating || !feedbackType || isSubmitting}
            >
              <Text
                className="text-slate-950 font-medium"
                style={{ fontFamily: "Figtree-Medium" }}
              >
                {isSubmitting ? "Submitting..." : "Submit Feedback"}
              </Text>
            </PrimaryButton>
          </View>
          <SecondaryButton onPress={onClose}>
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
