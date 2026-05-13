import { useAIChatFabTransitionStore } from "@/stores/aiChatFabTransitionStore";
import type { FabWindowRect } from "@/stores/aiChatFabTransitionStore";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import {
  AccessibilityInfo,
  Dimensions,
  InteractionManager,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  cancelAnimation,
  Easing,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const EMERALD = "#10b981";
const DARK_SURFACE = "#020617";
const CHAT_PATH = "/budget/ai-chat" as const;

/** Enter: fast finish, low “ease-in” feel (UI animation guidelines). */
const EASING_EXPAND = Easing.bezier(0.22, 1, 0.36, 1);
/** Exit: weight into the FAB without excessive hang. */
const EASING_COLLAPSE = Easing.bezier(0.4, 0, 0.2, 1);

const DURATION_EXPAND_MS = Platform.OS === "ios" ? 450 : 400;
const DURATION_COLLAPSE_MS = Platform.OS === "ios" ? 350 : 300;

function coverDiameter(rect: FabWindowRect): {
  cx: number;
  cy: number;
  startD: number;
  endD: number;
} {
  const { width: ww, height: wh } = Dimensions.get("window");
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const startD = Math.max(rect.width, rect.height, 1);
  const corners: [number, number][] = [
    [0, 0],
    [ww, 0],
    [0, wh],
    [ww, wh],
  ];
  let maxR = 0;
  for (const [x, y] of corners) {
    const r = Math.hypot(x - cx, y - cy) + 56;
    if (r > maxR) maxR = r;
  }
  const endD = Math.max(maxR * 2, startD + 1);
  return { cx, cy, startD, endD };
}

/**
 * Full-window morph: emerald circle scales from the FAB (GPU-friendly `transform`)
 * then navigates. Collapse reverses when the session was opened from the FAB.
 */
export function AIChatFabTransitionOverlay() {
  const router = useRouter();
  const phase = useAIChatFabTransitionStore((s) => s.phase);
  const anchor = useAIChatFabTransitionStore((s) => s.anchor);
  const finishExpand = useAIChatFabTransitionStore((s) => s.finishExpand);
  const finishCollapse = useAIChatFabTransitionStore((s) => s.finishCollapse);

  const cx = useSharedValue(0);
  const cy = useSharedValue(0);
  const endD = useSharedValue(400);
  /** startD / endD — scale runs from this to 1 */
  const startScale = useSharedValue(0.14);
  const progress = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => {
        reduceMotionRef.current = enabled;
      },
    );
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      reduceMotionRef.current = v;
    });
    return () => sub.remove();
  }, []);

  const circleStyle = useAnimatedStyle(() => {
    const scale = startScale.value + (1 - startScale.value) * progress.value;
    const d = endD.value;
    const backgroundColor = interpolateColor(
      progress.value,
      [0, 0.7, 1],
      [EMERALD, EMERALD, DARK_SURFACE],
    );

    return {
      position: "absolute" as const,
      left: cx.value - d / 2,
      top: cy.value - d / 2,
      width: d,
      height: d,
      borderRadius: d / 2,
      backgroundColor,
      transform: [{ scale }],
    };
  });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
    backgroundColor: "black",
  }));

  const applyGeometry = useCallback(
    (rect: FabWindowRect) => {
      const g = coverDiameter(rect);
      cx.value = g.cx;
      cy.value = g.cy;
      endD.value = g.endD;
      startScale.value = Math.min(1, g.startD / g.endD);
    },
    [cx, cy, endD, startScale],
  );

  const navigateToChatJS = useCallback(() => {
    router.navigate(CHAT_PATH);
    InteractionManager.runAfterInteractions(() => {
      finishExpand();
    });
  }, [router, finishExpand]);

  useEffect(() => {
    if (phase !== "expanding" || !anchor) {
      return;
    }

    applyGeometry(anchor);

    let cancelled = false;

    void AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled) return;

      if (reduceMotion || reduceMotionRef.current) {
        progress.value = 1;
        backdropOpacity.value = 1;
        navigateToChatJS();
        return;
      }

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

      progress.value = 0;
      backdropOpacity.value = 0;

      backdropOpacity.value = withTiming(1, { duration: 150 });

      progress.value = withTiming(
        1,
        {
          duration: DURATION_EXPAND_MS,
          easing: EASING_EXPAND,
        },
        (finished) => {
          if (finished) {
            runOnJS(navigateToChatJS)();
          }
        },
      );
    });

    return () => {
      cancelled = true;
      cancelAnimation(progress);
    };
  }, [phase, anchor, applyGeometry, navigateToChatJS, progress, backdropOpacity]);

  useEffect(() => {
    if (phase !== "collapsing" || !anchor) {
      return;
    }

    applyGeometry(anchor);

    let cancelled = false;

    void AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled) return;

      if (reduceMotion || reduceMotionRef.current) {
        progress.value = 0;
        backdropOpacity.value = 0;
        runOnJS(finishCollapse)();
        return;
      }

      progress.value = 1;
      backdropOpacity.value = 1;

      backdropOpacity.value = withTiming(0, {
        duration: DURATION_COLLAPSE_MS,
        easing: Easing.out(Easing.quad),
      });

      progress.value = withTiming(
        0,
        {
          duration: DURATION_COLLAPSE_MS,
          easing: EASING_COLLAPSE,
        },
        (finished) => {
          if (finished) {
            runOnJS(finishCollapse)();
          }
        },
      );
    });

    return () => {
      cancelled = true;
      cancelAnimation(progress);
    };
  }, [phase, anchor, applyGeometry, finishCollapse, progress, backdropOpacity]);

  const active = phase === "expanding" || phase === "collapsing";

  if (!active || !anchor) {
    return null;
  }

  return (
    <View
      pointerEvents="auto"
      style={[StyleSheet.absoluteFillObject, styles.layer]}>
      <Animated.View style={[StyleSheet.absoluteFillObject, backdropStyle]} />
      <Animated.View style={circleStyle} />
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    zIndex: 100000,
    elevation: 100000,
    backgroundColor: "transparent",
  },
});
