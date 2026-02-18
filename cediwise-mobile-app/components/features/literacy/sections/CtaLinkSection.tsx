import type { LessonSection } from "@/types/literacy";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { ArrowRight, Calculator, PiggyBank, TrendingUp, Wallet } from "lucide-react-native";
import React, { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type CtaSection = Extract<LessonSection, { type: "cta_link" }>;

type CtaLinkSectionProps = {
  section: CtaSection;
};

/** Maps deep-link destination strings to router paths */
function resolveRoute(destination: string): string {
  const routes: Record<string, string> = {
    "feature://salary-calculator": "/(tabs)/",
    "feature://budget-builder": "/(tabs)/budget",
    "feature://savings-goal": "/literacy/calculator/savings-goal-v1",
    "feature://budget-builder-v1": "/literacy/calculator/budget-builder-v1",
    "feature://tbill-calculator": "/(tabs)/",
  };
  return routes[destination] ?? destination;
}

function getCtaIcon(destination: string) {
  if (destination.includes("budget")) return Wallet;
  if (destination.includes("savings")) return PiggyBank;
  if (destination.includes("tbill") || destination.includes("invest")) return TrendingUp;
  return Calculator;
}

export function CtaLinkSection({ section }: CtaLinkSectionProps) {
  const Icon = getCtaIcon(section.destination);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const route = resolveRoute(section.destination);
    router.push(route as Parameters<typeof router.push>[0]);
  }, [section.destination]);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <View style={styles.iconWrap}>
        <Icon size={22} color="#1B6B3A" />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.label}>{section.label}</Text>
        {section.description && (
          <Text style={styles.description} numberOfLines={2}>
            {section.description}
          </Text>
        )}
      </View>
      <ArrowRight size={18} color="#2D9B5A" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 8,
    backgroundColor: "rgba(27,107,58,0.15)",
    borderWidth: 1,
    borderColor: "rgba(45,155,90,0.35)",
    borderRadius: 35,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  pressed: {
    opacity: 0.8,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 18,
    backgroundColor: "rgba(27,107,58,0.25)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 15,
    fontFamily: "Figtree-Bold",
    color: "#86efac",
  },
  description: {
    fontSize: 13,
    fontFamily: "Figtree-Regular",
    color: "#94a3b8",
    lineHeight: 18,
  },
});
