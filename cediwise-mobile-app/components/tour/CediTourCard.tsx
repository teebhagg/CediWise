import { tourTokens } from "@/constants/tourTokens";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { CardProps } from "react-native-lumen";

export function CediTourCard({
  step,
  next,
  prev,
  stop,
  isFirst,
  isLast,
  required,
  completed = true,
}: CardProps) {
  const isNextDisabled = completed === false;

  return (
    <View
      style={styles.container}
      accessibilityRole="summary"
      accessibilityLabel={step.name ?? "Tour step"}>
      {step.name ? (
        <Text style={styles.title}>{step.name}</Text>
      ) : null}
      <Text style={styles.body}>{step.description}</Text>
      <View style={styles.buttons}>
        {!isFirst ? (
          <Pressable
            onPress={prev}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Back"
            accessibilityHint="Go to previous step">
            <Text style={styles.buttonText}>Back</Text>
          </Pressable>
        ) : (
          <View style={styles.backButton} />
        )}
        {!required && (
          <Pressable
            onPress={stop}
            style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Skip"
            accessibilityHint="Skip the tour">
            <Text style={styles.skipButtonText}>Skip</Text>
          </Pressable>
        )}
        <Pressable
          onPress={next}
          disabled={isNextDisabled}
          style={({ pressed }) => [
            styles.nextButton,
            isNextDisabled && styles.nextButtonDisabled,
            pressed && !isNextDisabled && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityState={{ disabled: isNextDisabled }}
          accessibilityLabel={isLast ? "Finish" : "Next"}
          accessibilityHint={isLast ? "Finish the tour" : "Go to next step"}>
          <Text
            style={[
              styles.nextButtonText,
              isNextDisabled && styles.nextButtonTextDisabled,
            ]}>
            {isLast ? "Finish" : "Next"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: tourTokens.card.background,
    borderColor: tourTokens.card.border,
    borderWidth: 1,
    borderRadius: tourTokens.card.borderRadius,
    padding: tourTokens.card.padding,
    width: tourTokens.card.width,
  },
  title: {
    color: tourTokens.title.color,
    fontFamily: "Figtree-Medium",
    fontSize: 18,
    marginBottom: 8,
  },
  body: {
    color: tourTokens.body.color,
    fontFamily: "Figtree-Regular",
    fontSize: 15,
    marginBottom: 16,
  },
  buttons: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    gap: 12,
  },
  backButton: {
    minHeight: tourTokens.buttons.minHeight,
    minWidth: tourTokens.buttons.minWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  skipButton: {
    minHeight: tourTokens.buttons.minHeight,
    minWidth: tourTokens.buttons.minWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  skipButtonText: {
    color: tourTokens.buttons.skipText,
    fontFamily: "Figtree-Medium",
    fontSize: 15,
  },
  nextButton: {
    backgroundColor: tourTokens.buttons.nextBackground,
    borderRadius: tourTokens.buttons.nextRadius,
    minWidth: tourTokens.buttons.minWidth,
    minHeight: tourTokens.buttons.minHeight,
    alignItems: "center",
    justifyContent: "center",
  },
  nextButtonDisabled: {
    backgroundColor: tourTokens.buttons.nextBackgroundDisabled,
  },
  nextButtonText: {
    color: tourTokens.buttons.nextText,
    fontFamily: "Figtree-SemiBold",
    fontSize: 15,
  },
  nextButtonTextDisabled: {
    color: tourTokens.buttons.nextTextDisabled,
  },
  buttonText: {
    color: tourTokens.buttons.backText,
    fontFamily: "Figtree-Medium",
    fontSize: 15,
  },
  pressed: {
    opacity: 0.8,
  },
});
