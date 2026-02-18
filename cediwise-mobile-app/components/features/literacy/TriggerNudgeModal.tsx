import { GlassBottomSheet } from "@/components/GlassBottomSheet";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";
import type BottomSheet from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import { BookOpen, Sparkles, X } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

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
  const bottomSheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    // Small delay to ensure sheet is ready
    const timer = setTimeout(() => {
      bottomSheetRef.current?.expand();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    bottomSheetRef.current?.close();
    setTimeout(onDismiss, 200);
  };

  const handleLearnMore = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    bottomSheetRef.current?.close();
    setTimeout(onLearnMore, 200);
  };

  return (
    <GlassBottomSheet ref={bottomSheetRef} snapPoints={["40%"]} onClose={onDismiss}>
      <View className="flex-1">
        <Animated.View
          entering={FadeInDown.delay(0).springify()}
          className="flex-row items-center gap-3 mb-4"
        >
          <View className="w-12 h-12 rounded-full bg-emerald-500/20 items-center justify-center">
            <Sparkles size={24} color="#10b981" />
          </View>
          <Text
            className="text-white text-xl font-bold flex-1"
            style={{ fontFamily: "Figtree-Bold" }}
          >
            {title}
          </Text>
          <Pressable
            onPress={handleDismiss}
            hitSlop={12}
            className="p-1 -m-1"
          >
            <X size={22} color="#94a3b8" />
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <Text
            className="text-slate-300 text-base leading-relaxed mb-6"
            style={{ fontFamily: "Figtree-Regular" }}
          >
            {message}
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          className="flex-row gap-3"
        >
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
        </Animated.View>
      </View>
    </GlassBottomSheet>
  );
}
