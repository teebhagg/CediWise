import React, { forwardRef } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ScrollViewProps,
  StyleProp,
  ViewStyle,
} from "react-native";

type KeyboardAwareScrollViewProps = ScrollViewProps & {
  /** Optional style for the KeyboardAvoidingView wrapper */
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * ScrollView wrapped in KeyboardAvoidingView for form screens.
 * Use where keyboard avoidance is needed—scopes adjustment to this content only.
 * Keep headers/footers outside for predictable layout.
 */
export const KeyboardAwareScrollView = forwardRef<ScrollView, KeyboardAwareScrollViewProps>(
  function KeyboardAwareScrollView({ containerStyle, children, ...scrollProps }, ref) {
    return (
      <KeyboardAvoidingView
        style={[{ flex: 1, minHeight: 0 }, containerStyle]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          ref={ref}
          keyboardShouldPersistTaps="handled"
          {...scrollProps}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }
);
