import { BlurView } from "expo-blur";
import React from "react";
import { Platform, View, type ViewProps } from "react-native";

type BlurTint = "light" | "dark" | "default" | "extraLight" | "regular" | "prominent";

export interface GlassViewProps extends ViewProps {
  /** Blur intensity 1–100 (iOS only). */
  intensity?: number;
  /** Tint for blur (iOS) or solid background color (Android). */
  tint?: BlurTint;
  children?: React.ReactNode;
}

/**
 * Cross-platform "glass" surface: BlurView on iOS, solid opaque View on Android.
 * Android uses no blur for initial release; surfaces are fully opaque.
 */
export function GlassView({
  intensity = 50,
  tint = "dark",
  style,
  children,
  ...rest
}: GlassViewProps) {
  if (Platform.OS === "android") {
    const backgroundColor =
      tint === "dark"
        ? "#000000"
        : tint === "light"
          ? "#FFFFFF"
          : "#1f2937";

    return (
      <View style={[style, { backgroundColor }]} {...rest}>
        {children}
      </View>
    );
  }

  return (
    <BlurView intensity={intensity} tint={tint} style={style} {...rest}>
      {children}
    </BlurView>
  );
}
