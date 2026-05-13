import React, { useMemo, useState, type LayoutChangeEvent } from "react";
import { View, type ViewProps, StyleSheet } from "react-native";

// Types
type BlurTint = "light" | "dark" | "default" | "extraLight" | "regular" | "prominent";

export interface SkiaGlassViewProps extends ViewProps {
  /** Blur intensity 1-100 (maps to Skia blur radius). */
  intensity?: number;
  /** Tint for the glass overlay. */
  tint?: BlurTint;
  children?: React.ReactNode;
}

const TINT_COLORS: Record<string, string> = {
  dark: "rgba(27, 67, 50, 0.65)",
  light: "rgba(255, 255, 255, 0.65)",
  default: "rgba(31, 41, 55, 0.65)",
  extraLight: "rgba(255, 255, 255, 0.70)",
  regular: "rgba(255, 255, 255, 0.50)",
  prominent: "rgba(255, 255, 255, 0.80)",
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Skia-powered glassmorphism view.
 * Renders a blurred semi-transparent overlay using Skia Canvas.
 * Safely handles missing native modules by using dynamic requires.
 */
export function SkiaGlassView({
  intensity = 50,
  tint = "dark",
  style,
  children,
  ...rest
}: SkiaGlassViewProps) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  // Dynamically check and require Skia components to prevent crashes on startup
  const Skia = useMemo(() => {
    try {
      // Dynamic require: optional native Skia module may be unavailable in some builds.
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- intentional runtime probe
      const { Canvas, BackdropBlur, Fill } = require("@shopify/react-native-skia");
      return { Canvas, BackdropBlur, Fill };
    } catch {
      return null;
    }
  }, []);

  const blurRadius = useMemo(() => {
    const validIntensity = clamp(intensity ?? 50, 1, 100);
    return (validIntensity / 100) * 20;
  }, [intensity]);

  const fillColor = TINT_COLORS[tint] ?? TINT_COLORS.dark;

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width !== layout.width || height !== layout.height) {
      setLayout({ width, height });
    }
  };

  // If Skia is not available, render a simple translucent fallback
  if (!Skia) {
    return (
      <View
        style={[style, { backgroundColor: fillColor, opacity: 0.65 }]}
        {...rest}
      >
        {children}
      </View>
    );
  }

  const { Canvas, BackdropBlur, Fill } = Skia;

  return (
    <View style={[style, { position: "relative" }]} onLayout={handleLayout} {...rest}>
      {layout.width > 0 && layout.height > 0 && (
        <Canvas style={StyleSheet.absoluteFill}>
          <BackdropBlur blur={blurRadius}>
            <Fill color={fillColor} />
          </BackdropBlur>
        </Canvas>
      )}
      {children && (
        <View style={{ zIndex: 1, position: "relative" }}>{children}</View>
      )}
    </View>
  );
}
