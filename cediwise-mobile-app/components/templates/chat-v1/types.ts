import type React from "react";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";

/**
 * One option in the chat composer chip grid (e.g. quick prompts or suggestions).
 * Supplies the label, optional icon node, and optional press handler for a single chip.
 */
interface IChipOption {
  /** Visible label string drawn on the chip. */
  text: string;
  /** Icon content rendered inside the chip (typically a small React node, e.g. vector icon). */
  icon: React.ReactNode;
  /**
   * Optional. Invoked when the user presses the chip; omit for display-only rows
   * or when interaction is handled outside this callback.
   */
  onPress?: () => void;
}

interface IChipGrid {
  options: IChipOption[];
  columns?: number;
  gap?: number;
  containerStyle?: StyleProp<ViewStyle>;
  chipStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  iconStyle?: StyleProp<ViewStyle>;
}

export type { IChipOption, IChipGrid };
