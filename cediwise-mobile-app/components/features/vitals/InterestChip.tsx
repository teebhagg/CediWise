import * as Haptics from "expo-haptics";
import { memo, useEffect } from "react";
import { Pressable, Text } from "react-native";
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedText = Animated.createAnimatedComponent(Text);

const interestChipBaseStyle = {
  minHeight: 44,
  paddingHorizontal: 14,
  paddingVertical: 10,
  borderRadius: 999,
  borderWidth: 1,
  alignItems: "center",
  justifyContent: "center",
} as const;

type InterestChipProps = {
  label: string;
  selected: boolean;
  onToggle: (label: string) => void;
  /** When true, triggers a light haptic on toggle (default: false). */
  haptic?: boolean;
};

export const InterestChip = memo(
  function InterestChipInner({ label, selected, onToggle, haptic = false }: InterestChipProps) {
    const selectedSV = useSharedValue(selected ? 1 : 0);
    const pressedSV = useSharedValue(0);

    useEffect(() => {
      selectedSV.value = withTiming(selected ? 1 : 0, {
        duration: 180,
        easing: Easing.out(Easing.cubic),
      });
    }, [selected, selectedSV]);

    const containerStyle = useAnimatedStyle(() => {
      const bg = interpolateColor(
        selectedSV.value,
        [0, 1],
        ["rgba(148,163,184,0.14)", "rgba(255,255,255,0.92)"]
      );
      const border = interpolateColor(
        selectedSV.value,
        [0, 1],
        ["rgba(148,163,184,0.25)", "rgba(255,255,255,0.35)"]
      );
      const scale = 1 + 0.04 * selectedSV.value - 0.03 * pressedSV.value;
      const opacity = 1 - 0.06 * pressedSV.value;

      return {
        backgroundColor: bg,
        borderColor: border,
        opacity,
        transform: [{ scale }],
        shadowColor: "#22C55E",
        shadowOpacity: 0.22 * selectedSV.value,
        shadowRadius: 10 * selectedSV.value,
        shadowOffset: { width: 0, height: 0 },
        elevation: Math.round(3 * selectedSV.value),
      };
    });

    const textStyle = useAnimatedStyle(() => ({
      color: interpolateColor(selectedSV.value, [0, 1], ["#E2E8F0", "#000000"]),
    }));

    return (
      <AnimatedPressable
        onPress={async () => {
          if (haptic) {
            try {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch {
              // ignore
            }
          }
          onToggle(label);
        }}
        accessibilityRole="button"
        accessibilityLabel={`Interest ${label}`}
        onPressIn={() => {
          pressedSV.value = withSpring(1, { stiffness: 300, damping: 22 });
        }}
        onPressOut={() => {
          pressedSV.value = withSpring(0, { stiffness: 300, damping: 22 });
        }}
        style={[interestChipBaseStyle, containerStyle]}
      >
        <AnimatedText style={[{ fontFamily: "Figtree-Medium", fontSize: 13 }, textStyle]}>
          {label}
        </AnimatedText>
      </AnimatedPressable>
    );
  },
  (prev, next) =>
    prev.selected === next.selected &&
    prev.label === next.label &&
    prev.onToggle === next.onToggle &&
    prev.haptic === next.haptic
);

