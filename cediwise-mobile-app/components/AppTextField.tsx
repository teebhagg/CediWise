import { FieldError, Input, Label, TextField } from "heroui-native";
import React, { forwardRef, useState } from "react";
import { TextInput, TextInputProps, View } from "react-native";
import { useKeyboardCentering } from "./common/KeyboardCenteringScrollView";

const PLACEHOLDER_COLOR = "rgba(148,163,184,0.6)";

export type AppTextFieldProps = Omit<TextInputProps, "style"> & {
  /* Prefix icon */
  prefixIcon?: React.ReactNode;
  /* Suffix icon */
  suffixIcon?: React.ReactNode;
  /** Label shown above the input (e.g. "Name", "Amount (GHS)") */
  label?: string;
  /** Error message shown below the input; when set, input border shows error state */
  error?: string;
  /** Optional class name for the wrapper View */
  containerClassName?: string;
  /** Optional class name for the TextInput */
  inputClassName?: string;
};

export const AppTextField = forwardRef<TextInput, AppTextFieldProps>(
  function AppTextField(
    {
      prefixIcon,
      suffixIcon,
      label,
      error,
      containerClassName,
      inputClassName,
      placeholderTextColor = PLACEHOLDER_COLOR,
      returnKeyType = "done",
      onFocus,
      onBlur,
      ...rest
    },
    ref,
  ) {
    const [focused, setFocused] = useState(false);
    const inputRef = React.useRef<TextInput>(null);

    // Merge the forwarded ref with our internal ref so the centering logic
    // can call measureLayout() on the native node, and parent screens can
    // still call .focus() / .blur() via the forwarded ref.
    const mergedRef = (node: TextInput | null) => {
      inputRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    // Provided by the nearest KeyboardCenteringScrollView ancestor.
    // Null when AppTextField is rendered outside that context (no-op).
    const centering = useKeyboardCentering();

    const stateClass = error
      ? "border-red-500/45 border-2"
      : focused
        ? "ring-2 ring-emerald-500/20"
        : "ring-1 ring-white/10";

    return (
      <View className={containerClassName}>
        <TextField>
          {prefixIcon && (
            <View className="absolute left-3 top-1/2 -translate-y-1/2">
              {prefixIcon}
            </View>
          )}
          <Label>{label}</Label>
          {suffixIcon && (
            <View className="absolute right-3 top-1/2 -translate-y-1/2">
              {suffixIcon}
            </View>
          )}
          <Input
            ref={mergedRef}
            returnKeyType={returnKeyType}
            placeholderTextColor={PLACEHOLDER_COLOR}
            {...rest}
            onFocus={(e) => {
              setFocused(true);
              // Trigger measurement-based centering when inside a
              // KeyboardCenteringScrollView. No-op when centering is null.
              if (centering?.scrollToCenter && inputRef.current) {
                centering.scrollToCenter(inputRef);
              }
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            className={`rounded-[18px] ${stateClass} ${inputClassName || ""}`}
          />
          <FieldError>{error}</FieldError>
        </TextField>
      </View>
    );
  },
);
