import { CustomBottomSheet } from "@/components/common/CustomBottomSheet";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";
import * as Haptics from "expo-haptics";
import { BookOpen } from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";

type TriggerNudgeModalProps = {
  title: string;
  message: string;
  ctaLabel: string;
  onDismiss: () => void;
  onLearnMore: () => void;
};

export function TriggerNudgeModal({
  title,
  message,
  ctaLabel,
  onDismiss,
  onLearnMore,
}: TriggerNudgeModalProps) {
  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
  };

  const handleLearnMore = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLearnMore();
  };

  return (
    <CustomBottomSheet
      title={title}
      description={message}
      isOpen={true}
      onOpenChange={(open) => {
        if (!open) onDismiss();
      }}
    >
      <View className="flex-row gap-3">
        <View className="flex-1">
          <PrimaryButton onPress={handleLearnMore}>
            <BookOpen size={16} color="#020617" />
            <Text
              className="ml-2 text-slate-950 font-medium"
              style={{ fontFamily: "Figtree-Medium" }}
            >
              {ctaLabel}
            </Text>
          </PrimaryButton>
        </View>
        <SecondaryButton onPress={handleDismiss}>
          <Text
            className="text-slate-300 font-medium"
            style={{ fontFamily: "Figtree-Medium" }}
          >
            Dismiss
          </Text>
        </SecondaryButton>
      </View>
    </CustomBottomSheet>
  );
}
