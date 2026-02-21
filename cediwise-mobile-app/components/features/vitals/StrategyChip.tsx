import { Check } from "lucide-react-native";
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

import type { PersonalizationStrategy } from "@/utils/profileVitals";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedText = Animated.createAnimatedComponent(Text);

const strategyChipBaseStyle = {
  minHeight: 44,
  paddingHorizontal: 14,
  paddingVertical: 10,
  borderRadius: 999,
  borderWidth: 1,
  alignItems: "center",
  justifyContent: "center",
} as const;

type StrategyChipProps = {
  label: string;
  value: PersonalizationStrategy;
  selected: boolean;
  onSelect: (value: PersonalizationStrategy) => void;
};

export const StrategyChip = memo(
  function StrategyChipInner({ label, value, selected, onSelect }: StrategyChipProps) {
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
        ["rgba(148,163,184,0.10)", "rgba(34,197,94,0.2)"]
      );
      const border = interpolateColor(
        selectedSV.value,
        [0, 1],
        ["rgba(148,163,184,0.25)", "rgba(34,197,94,0.5)"]
      );
      const scale = 1 + 0.03 * selectedSV.value - 0.03 * pressedSV.value;
      const opacity = 1 - 0.06 * pressedSV.value;
      return {
        backgroundColor: bg,
        borderColor: border,
        opacity,
        transform: [{ scale }],
      };
    });

    const textStyle = useAnimatedStyle(() => ({
      color: interpolateColor(selectedSV.value, [0, 1], ["#E2E8F0", "#E2E8F0"]),
    }));

    const checkStyle = useAnimatedStyle(() => ({
      opacity: selectedSV.value,
      transform: [{ scale: 0.9 + 0.1 * selectedSV.value }],
    }));

    return (
      <AnimatedPressable
        onPress={() => onSelect(value)}
        accessibilityRole="button"
        accessibilityLabel={`Plan ${label}`}
        onPressIn={() => {
          pressedSV.value = withSpring(1, { stiffness: 300, damping: 22 });
        }}
        onPressOut={() => {
          pressedSV.value = withSpring(0, { stiffness: 300, damping: 22 });
        }}
        style={[
          strategyChipBaseStyle,
          containerStyle,
          { flexDirection: "row", alignItems: "center", gap: 8 },
        ]}
      >
        <AnimatedText
          style={[
            { fontFamily: "Figtree-Medium", fontSize: 13 },
            textStyle,
          ]}
        >
          {label}
        </AnimatedText>
        <Animated.View
          style={[
            { width: 18, height: 18, alignItems: "center", justifyContent: "center" },
            checkStyle,
          ]}
        >
          <Check size={16} color={selected ? "#000000" : "transparent"} />
        </Animated.View>
      </AnimatedPressable>
    );
  },
  (prev, next) =>
    prev.selected === next.selected &&
    prev.label === next.label &&
    prev.value === next.value &&
    prev.onSelect === next.onSelect
);

