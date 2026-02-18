import type { GlassBottomSheetHandle } from "@/components/GlassBottomSheet";
import { GlassBottomSheet } from "@/components/GlassBottomSheet";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/utils/supabase";
import {
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import { MessageCircle, X } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";

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
  const sheetRef = useRef<GlassBottomSheetHandle>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [feedbackType, setFeedbackType] = useState<FeedbackType | null>(null);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      sheetRef.current?.expand();
    } else {
      sheetRef.current?.close();
    }
  }, [visible]);

  const handleClose = () => {
    sheetRef.current?.close();
    // onClose is called by GlassBottomSheet's onChange when sheet reaches index -1
  };

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
      handleClose();
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

  if (!visible) return null;

  return (
    <GlassBottomSheet
      ref={sheetRef}
      snapPoints={["82%"]}
      initialIndex={0}
      onClose={onClose}
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
    >
      <BottomSheetScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
          <View className="flex-row items-center gap-2 flex-1">
            <MessageCircle size={22} color="#10b981" />
            <Text
              className="text-white text-lg font-bold flex-1"
              style={{ fontFamily: "Figtree-Bold" }}
              numberOfLines={2}
            >
              Feedback: {lessonTitle}
            </Text>
          </View>
          <Pressable onPress={handleClose} hitSlop={12} className="p-1 -mr-2">
            <X size={22} color="#94a3b8" />
          </Pressable>
        </View>

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

        {/* Comment - BottomSheetTextInput for keyboard coordination */}
        <Text
          className="text-slate-300 text-sm mb-3"
          style={{ fontFamily: "Figtree-Medium" }}
        >
          Additional comments (optional)
        </Text>
        <BottomSheetTextInput
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
          <SecondaryButton onPress={handleClose}>
            <Text
              className="text-slate-300 font-medium"
              style={{ fontFamily: "Figtree-Medium" }}
            >
              Cancel
            </Text>
          </SecondaryButton>
        </View>
      </BottomSheetScrollView>
    </GlassBottomSheet>
  );
}
