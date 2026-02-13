import { useMemo, useState } from "react";
import {
  Keyboard,
  Platform,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import {AppTextField} from "./AppTextField";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

type Props = Omit<TextInputProps, "style"> & {
  label: string;
  error?: string;
};

const AnimatedView = Animated.createAnimatedComponent(View);

export function LabeledTextInput({
  label,
  error,
  onFocus,
  onBlur,
  onSubmitEditing,
  returnKeyType,
  inputAccessoryViewID,
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
        // style={[
        //   {
        //     borderRadius: 16,
        //     borderWidth: 1,
        //     borderColor: error ? "rgba(239,68,68,0.55)" : "rgba(255,255,255,0.10)",
        //     backgroundColor: "transparent",
        //     paddingHorizontal: 16,
        //     height: 54,
        //     justifyContent: "center",
        //   },
        // ]}
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

