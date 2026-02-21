import { InputProps } from 'heroui-native';
import {
  Text,
  View
} from "react-native";
import Animated from "react-native-reanimated";
import { AppTextField } from "./AppTextField";

type Props = Omit<InputProps, "style"> & {
  label: string;
  error?: string;
};

const AnimatedView = Animated.createAnimatedComponent(View);

export function LabeledTextInput({
  label,
  error,
  ...rest
}: Props) {

  return (
    <View style={{ gap: 8 }}>
      <Text
        style={{
          color: error ? "#FCA5A5" : "#9CA3AF",
          fontFamily: "Figtree-Medium",
          fontSize: 14,
          letterSpacing: 0.6,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>

      <AnimatedView
      >
        <AppTextField
          {...rest}
        />
      </AnimatedView>

      {error ? (
        <Text style={{ color: "#FCA5A5", fontFamily: "Figtree-Regular", fontSize: 12 }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

