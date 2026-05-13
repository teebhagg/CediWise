import { BlurView } from "expo-blur";
import React from "react";
import { type ViewProps } from "react-native";

// Only values expo-blur actually accepts cross-platform
type BlurTint = "light" | "dark" | "default";

export interface GlassViewProps extends ViewProps {
  intensity?: number;
  tint?: BlurTint;
  children?: React.ReactNode;
}

export function GlassView({
  intensity = 50,
  tint = "dark",
  style,
  children,
  ...rest
}: GlassViewProps) {
  return (
    <BlurView
      intensity={intensity}
      tint={tint}
      // experimentalBlurMethod="dimezisBlurViewSdk31Plus"
      style={style}
      {...rest}
    >
      {children}
    </BlurView>
  );
}