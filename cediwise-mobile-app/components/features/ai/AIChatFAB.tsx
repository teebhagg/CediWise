import { Image } from "expo-image";
import { Pressable, Text, View, type LayoutChangeEvent } from "react-native";
import { useCallback, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

const FAB_AVATAR = require("@/assets/images/my-notion-face-transparent.png");

export interface AIChatFABProps {
  /** When remaining is low (e.g. ≤2), surface a badge. */
  remaining: number | null;
  disabled?: boolean;
  /** Fires before measuring / starting the expand transition (analytics, etc.). */
  onBeforeExpand?: () => void;
  targetRoute?: string;
}

export function AIChatFAB({
  remaining,
  disabled,
  onBeforeExpand,
  targetRoute = "/budget/ai-chat",
}: AIChatFABProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const badge = typeof remaining === "number" && remaining <= 2;
  const shellRef = useRef<View>(null);
  const layoutRef = useRef({ w: 56, h: 56 });

  const onFabLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    layoutRef.current = { w: width, h: height };
  }, []);

  const triggerExpand = useCallback(() => {
    if (disabled) return;
    onBeforeExpand?.();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.navigate(targetRoute as any);
  }, [disabled, onBeforeExpand, router, targetRoute]);

  return (
    <View
      pointerEvents="box-none"
      className="absolute right-5 z-20"
      style={{ bottom: insets.bottom + 88 }}>
      <View
        ref={shellRef}
        collapsable={false}
        onLayout={onFabLayout}
        className="h-14 w-14 rounded-full overflow-visible">
        <Pressable
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Open AI budget assistant"
          onPress={triggerExpand}
          className={`flex-1 rounded-full bg-emerald-500 items-center justify-center shadow-lg shadow-black/50 border border-emerald-400/25 ${
            disabled ? "opacity-40" : "active:opacity-95"
          }`}>
          <Image
            source={FAB_AVATAR}
            style={{ width: 40, height: 40 }}
            contentFit="contain"
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </Pressable>
        {badge ? (
          <View
            pointerEvents="none"
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 border border-black items-center justify-center">
            <Text className="text-white text-[9px] font-bold">{remaining}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
